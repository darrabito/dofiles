import _ from 'lodash';
import moment from 'moment';
import {ASYNC_TIGGER_IFRAME_URL} from '../constants';
import tree from 'state';
import setBrowserAction from 'messenger/outbound/setBrowserAction';
import siteCache from 'messenger/outbound/siteCache';
import currentDomain from 'utility/currentDomain';
import hasFeature from 'utility/hasFeature';
import sendMetric from 'utility/sendMetric';
import {getSavings} from 'content/coupons';
import {setupIframeMessenger} from '@c1/async-tigger-client/target';

import {tryCodes as tryCodesCouponActions, handleResult} from './couponActions';

const cursor = tree.select('couponView');

const localStorageHostnames = {
  'jet.com': true
};
const pageStorage = localStorageHostnames[window.location.hostname] ? localStorage : sessionStorage;

function checkStandDownOverride() {
  return (
    currentDomain() === 'ebay.com' &&
    tree.get(['selfStandDown', `${currentDomain()}_${tree.get('tabId')}`])
  );
}

async function setupRemoteIframe(remoteUrl) {
  const iframe = document.createElement('iframe');
  iframe.src = remoteUrl;
  iframe.style = 'position: fixed; top: 0; left: 0; border: 0; background: transparent;';
  iframe.width = 1;
  iframe.height = 1;
  document.body.appendChild(iframe);
  await setupIframeMessenger(iframe);
}

export async function tryCodes(options = {}) {
  return tryCodesCouponActions({...options, isAsyncTigger: true});
}

export async function initAsyncTigger(options = {}) {
  const domain = currentDomain();
  const {experience} = options;
  const platform = tree.get('platform');
  const siteAPIData = await siteCache(domain);
  let {coupons, ignoreAffiliate} = _.get(siteAPIData, 'siteData.coupons', {});
  let couponCount = coupons && coupons.length;
  let disableAffiliate = false;
  let standDown = false;
  let config = false;
  const standDownOverride = coupons && coupons.length && checkStandDownOverride();
  const disableCreditsOverride = coupons && coupons.length && domain === 'ebay.com';
  const disableCouponsOverride = !(coupons && coupons.length) && domain === 'ebay.com';

  if (standDownOverride) {
    setBrowserAction({active: true});
  }

  if (
    (ignoreAffiliate ||
      tree.get(['couponsAffiliateDisabledSites', `${domain}_${tree.get('tabId')}`]) >
        moment().unix() ||
      tree.get(['couponsAffiliateDisabledSites', `${domain}_all`]) > moment().unix()) &&
    !standDownOverride
  ) {
    cursor.set('disableAffiliate', true);
    disableAffiliate = true;
  }

  if (
    (tree.get(['couponsDisabledSites', `${domain}_${tree.get('tabId')}`]) > moment().unix() ||
      tree.get(['couponsDisabledSites', `${domain}_all`]) > moment().unix()) &&
    !standDownOverride
  ) {
    standDown = true;
  }

  // [TODO] refactor to share coupon listeners between asyncTigger and tigger
  if (hasFeature('user_contributed_codes_tigger')) {
    // const script = _.get(siteAPIData, 'siteData.coupons.script');
    // if (script) {
    //   if (domain === 'etsy.com') {
    //     setupEtsyCouponListener(script);
    //   } else if (domain === 'amazon.com') {
    //     setupAmazonCouponListener(script);
    //   } else {
    //     setupCouponListener(script);
    //   }
    // }
  }
  sendMetric('track', 'couponCheck', {
    domain,
    pagePath: location.pathname
  });
  let estimatedRunTime;
  let pageCoupons;

  const remoteUrl = `${ASYNC_TIGGER_IFRAME_URL}?site=${_.get(siteAPIData, 'siteData.tld')}`;
  if (!couponCount) {
    return config;
  }
  await setupRemoteIframe(remoteUrl);

  let previousRun;
  try {
    previousRun = JSON.parse(pageStorage.getItem('couponRun'));
    if (previousRun) {
      const siteData = {
        domain,
        pageTypes: _.get(siteAPIData, 'siteData.pageTypes')
      };
      const {savings, originalTotal} = await getSavings(siteData);
      previousRun.result.savings = savings;
      previousRun.result.originalTotal = originalTotal;
      previousRun.result.pageReload = undefined;
      pageStorage.removeItem('couponRun');
    }
  } catch (e) {
    pageStorage.removeItem('couponRun');
  }
  if (pageCoupons) {
    coupons = [];
    couponCount = pageCoupons;
  }
  config = {
    asyncTigger: true,
    coupons,
    estimatedRunTime,
    disableAffiliate,
    couponCount,
    affiliateLinkCurrentTab: _.get(siteAPIData, 'meta.affiliate_link_current_tab'),
    pageWasReloaded: !!previousRun,
    standDown,
    standDownOverride,
    disableCreditsOverride,
    disableCouponsOverride,
    autoCoupConfig: _.get(siteAPIData, 'siteData.coupons.config.auto_coup')
  };

  /* to ensure that we prompt on reload in spite of multiple calls into this function,
  we carry forward a true pageWasReloaded value */
  const oldConfig = tree.get('couponsConfig');
  const oldPageWasReloaded = _.get(oldConfig, 'pageWasReloaded');
  if (oldPageWasReloaded) {
    config.pageWasReloaded = true;
  }

  tree.set('couponsConfig', config);
  if (previousRun) {
    handleResult(previousRun);
  }
  return config;
}
