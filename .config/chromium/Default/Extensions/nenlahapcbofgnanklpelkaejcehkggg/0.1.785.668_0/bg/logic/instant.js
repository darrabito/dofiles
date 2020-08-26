import * as analytics from '../utility/analytics';
import getSiteDomainFromUrl from 'utility/getSiteDomainFromUrl';
import woodstock from 'iv-woodstock';
import _ from 'lodash';
import {
  runV3 as instantOffers,
  setMetricsCallback as setMetricsCallbackV2,
  updateConfig
} from 'iv-wb-light/dist/iv-wb-light-chrome';
import tree from '../state';
import localStore from 'storage/local';
import {reloadSetting} from 'storage/settings';
import {SITE_API, WIKIBUY_API, SS_ENV, CLIENT_LOGGER_URL} from 'constants';
import {setEvent} from 'api/preferences';
import {getCart} from 'api/cart';
import hasFeature from 'utility/hasFeature';
import getSite from 'cache/siteCache';
import getEbayOrderStats from './ebay';
import doWork from './worker';
import {getProductV2} from '../api/product';
import delay from '../utility/delay';

import modalDetailsReceived from 'messaging/notifications/outbound/modalDetailsReceived';
import amazonResultsReceived from 'messaging/notifications/outbound/amazonResultsReceived';
import communityDealReceived from 'messaging/notifications/outbound/communityDealReceived';
import abortRun from 'messaging/notifications/outbound/abortRun';
import siteList from '../resources/site-list.json';
import xhr from 'utility/xhr';
import cleanRunCache from 'utility/cleanRunCache';

const CACHE_EXPIRATION = 1000 * 60 * 15; // cache 15 min

// Setup environment endpoint V2
setMetricsCallbackV2((name, data) => {
  analytics.track(name, data);
});
updateConfig({
  WB_API_BASE: WIKIBUY_API.replace('/v1', ''),
  SITE_API_BASE: SITE_API.replace('/v2', ''),
  SS_ENV,
  LOG_URL: CLIENT_LOGGER_URL
});

const settingsCursor = tree.select(['settings']);
const postOnboardingRunCursor = tree.select(['postOnboardingRun']);

let ebayCheck = 0;
let workerCheck = 0;

const fetchingSites = {};
let running = false;

async function checkWoodstockData(details) {
  const domain = getSiteDomainFromUrl(details.url);
  if (fetchingSites[domain]) {
    fetchingSites[domain].requestQueue.push(details);
    return;
  }
  fetchingSites[domain] = {
    requestQueue: [details]
  };

  if (hasFeature('eb_o_ck') && domain === 'ebay.com' && new Date().getTime() > ebayCheck) {
    ebayCheck = new Date().getTime() + 24 * 60 * 60 * 1000; // check once a day
    getEbayOrderStats().then(orders => {
      if (orders) {
        _.forEach(orders, order => {
          analytics.track('ebayOrderHistory', order);
        });
      }
    });
  }
  if (hasFeature('worker_init_fetch') && new Date().getTime() > workerCheck) {
    workerCheck = new Date().getTime() + 24 * 60 * 60 * 1000;
    doWork();
  }

  getSite(domain, details.url).then(siteData => {
    _.forEach(fetchingSites[domain].requestQueue, details => {
      const properties = woodstock(details, siteData);
      if (properties) {
        analytics.track(properties.key || 'merchantCheckout', properties);
      }
      delete fetchingSites[domain];
    });
  });
}

chrome.webRequest.onBeforeRequest.addListener(
  details => {
    if (details && details.requestBody) {
      details.formData = details.requestBody.formData;
    }
    if (!running) {
      checkWoodstockData(details);
    }
  },
  {urls: siteList},
  ['requestBody']
);

async function patchRunWithSettings(data, overrideZip) {
  const {userId} = await localStore.get('userId');

  let settings = settingsCursor.get();
  let prime = settings.prime;
  let zipcode = settings.zipcode;
  let address = settings.address;
  let attempts = 0;

  const gotZipFromSettings = !!zipcode;
  while (!zipcode && attempts < 3) {
    attempts++;
    settings = await reloadSetting();
    prime = settings.prime;
    zipcode = settings.zipcode;
    address = settings.address;
  }
  if (!gotZipFromSettings) {
    analytics.track('extRunV3NoInputZipcode', {zipAfterRetries: zipcode});
  }

  data.userId = userId;
  data.prime = typeof prime === 'boolean' ? prime : true;
  data.zipcode = overrideZip || zipcode;
  if (!overrideZip && address) {
    data.address = address;
  }
  data.features = _.get(tree.get(['session']), 'features');
  if (data.features && _.get(data, 'product.vendor') === 'amazon.com') {
    data.features = [...data.features, 'show_deleted_results'];
  }
  data.events = settingsCursor.get('events');
  return data;
}

export async function getCartForRun(run) {
  const profileId = tree.get('profileId');
  const cartData = await getCart({
    items: [
      {
        run_id: _.get(run, 'runId')
      }
    ],
    priceCheckId: tree.get('priceCheckId'),
    profileId
  });
  /*const hasBetterEbayResult = _.get(cartData, 'items[0].meta.ebayResult');
  if (hasBetterEbayResult) {
    const CACHEBUSTER = Math.floor(Math.random() * 99999);
    if (hasFeature('EBAY_OFF_2_CONTROL')) {
      // Control Group/Off Group
      xhr('GET', `http://rover.ebay.com/roverimp/1/711-53200-19255-0/1?pub=1111111111&toolid=20000&campid=5337795679&mpt=${CACHEBUSTER}&ff19=0&ff20=${profileId}`)
    } else if(hasFeature('EBAY_ON_2')) {
      // Regular Treatment Group/On Group
      xhr('GET', `http://rover.ebay.com/roverimp/1/711-53200-19255-0/1?pub=1111111111&toolid=20000&campid=5337795679&mpt=${CACHEBUSTER}&ff19=1&ff20=${profileId}`)
    } else if(hasFeature('EBAY_ON_COUPON_2')){
      // Coupon Treatment Group/On-Coupon Group
      xhr('GET', `http://rover.ebay.com/roverimp/1/711-53200-19255-0/1?pub=1111111111&toolid=20000&campid=5337795679&mpt=${CACHEBUSTER}&ff19=2&ff20=${profileId} `)
    } else {}
  }*/

  cartData.items = _.map(cartData.items, item => {
    item.betterResults = _.map(item.betterResults, betterResult => {
      const rawResult = _.find(run.betterResults, {id: betterResult.id});
      betterResult.meta = rawResult
        ? _.assign({}, betterResult.meta, rawResult.meta)
        : _.assign({}, betterResult.meta);
      return betterResult;
    });
    item.result = item.betterResults[0];
    return item;
  });
  return cartData;
}

async function getCommunityDeal(asin, retries) {
  let deal = await getProductV2({asin});
  while (!deal && retries) {
    await delay(1000);
    deal = await getProductV2({asin});
    --retries;
  }
  return deal;
}

export async function startRun(data, overrideZip) {
  cleanRunCache();
  data = await patchRunWithSettings(data, overrideZip);
  if (data.meta && (hasFeature('az_mk_res') || hasFeature('wbv2_list_est'))) {
    data.meta.shouldGetAmazonList = true;
  }
  if (data.meta && hasFeature('ext_instant_offers')) {
    data.meta.instantOffersEnabled = true;
  }
  if (data.meta && hasFeature('ext_full_pricing')) {
    data.meta.amazonFullPricing = true;
  }
  if (data.meta && data.meta.dealId) {
    data.meta.disableOriginPricing = true;
  }
  let amazonResults;
  let startedRun = {runId: 'aborted'};
  const tabId = _.get(data, 'meta.tab.id');
  running = true;

  const runTimeoutId = setTimeout(() => {
    abortRun(tabId, {runId: startedRun.runId});
    tree.set(['runCache', startedRun.runId], {cart: false, expires: Date.now()});
  }, 30000);
  const vendor = _.get(data, 'product.vendor') || 'amazon.com';
  let hasInstantOffers;
  startedRun = await instantOffers(data, async runResp => {
    const {runId, type, list, data} = runResp;
    if (type === 'amazonListPrices') {
      amazonResultsReceived(tabId, {runId, amazonResults: list});
    } else if (type === 'instantOffers' && !hasInstantOffers) {
      clearTimeout(runTimeoutId);
      hasInstantOffers = true;
      try {
        const cartData = await getCartForRun({runId: data.instantOffersRunId});
        cartData.instantOffers = data;
        tree.set(['runCache', data.instantOffersRunId], {
          parentRunId: startedRun.runId,
          expires: Date.now() + CACHE_EXPIRATION
        });
        modalDetailsReceived(tabId, cartData);
      } catch (e) {}
    } else if (type === 'complete') {
      running = false;
      clearTimeout(runTimeoutId);
      try {
        const cartData = await getCartForRun({runId});
        cartData.amazonResults = amazonResults;
        modalDetailsReceived(tabId, cartData);
        tree.set(['runCache', runId], {cart: cartData, expires: Date.now() + CACHE_EXPIRATION});
      } catch (e) {
        abortRun(tabId, {runId});
      }
    }
  });
  if (startedRun && startedRun.runId) {
    tree.set(['runCache', startedRun.runId], {running: true});
    if (data.asin) {
      getCommunityDeal(data.asin).then(deal => {
        if (deal) {
          communityDealReceived(tabId, {deal});
          if (_.get(deal, 'last_quote.quote_id')) {
            tree.set(['runCache', _.get(deal, 'last_quote.quote_id')], {
              parentRunId: startedRun.runId,
              expires: Date.now() + CACHE_EXPIRATION
            });
          }
        } else {
          communityDealReceived(tabId, {error: 'no deal found'});
        }
      });
    }
  }
  return startedRun;
}

export async function completeOnboarding() {
  settingsCursor.set('showOnboarding', false);
  setEvent('hasAgreedToTerms');

  let events = _.cloneDeep(tree.get(['settings', 'events']));
  events = _.merge(events, {hasAgreedToTerms: Date.now()});
  tree.set(['settings', 'events'], events);

  const postOnboardingRun = postOnboardingRunCursor.get();
  if (postOnboardingRun) {
    startRun(_.cloneDeep(postOnboardingRun));
    postOnboardingRunCursor.set(null);
  }
}
