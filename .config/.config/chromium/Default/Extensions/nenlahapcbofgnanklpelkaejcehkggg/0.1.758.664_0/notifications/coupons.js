import {React} from 'utility/css-ns';
import Coupon from 'pages/Coupon';
import CouponDemo from 'pages/Coupon/demo/CouponDemo';
import {Route} from 'react-router';
import loadApp from 'utility/loadApp';
import getUser from 'messenger/outbound/getUser';
import getGoogleContacts from 'messenger/outbound/getGoogleContacts';
import siteCache from 'messenger/outbound/siteCache';
import setBrowserAction from 'messenger/outbound/setBrowserAction';
import couponsMessenger from 'messenger/outbound/couponsMessenger';
import {
  initTigger,
  initOnlyShowCoupons,
  checkAutoCoupEnabled,
  sendCouponsOverrideEvent
} from 'actions/couponActions';
import {initCoupons as initRoo} from 'actions/rooActions';
import {initCashback} from 'actions/cashbackActions';
import {setDomain, default as currentDomain} from 'utility/currentDomain';
import getShopifyDomain from 'content/utility/shopify';
import {getPlatform} from 'content/utility/platform';
import {SITE_API, WIKIBUY_API} from 'constants';
import Promise from 'bluebird';
import tree from 'state';
import _ from 'lodash';
import moment from 'moment';
import dewey from 'utility/dewey';
import $ from 'jquery';
import sendMetric from 'utility/sendMetric';
import {appLoaded} from 'utility/appLoaded';
import {isTiggerSite} from 'iv-tigger';
import loadCashbackNotification from 'utility/loadCashbackNotification';
import hasFeature from 'utility/hasFeature';
import checkNordstromGuestCheckoutClickNeeded from 'content/nordstrom';
import dashUuid from 'common/utility/dashUuid';
import petcoGcRemovalCheck from 'content/sites/petco.com/'

window.__wb_timing.couponsRequireAt = performance.now();

/* global Set */
const CLASSIFIER_SITES = new Set(['etsy.com', 'amazon.com']);

let classifierFired = false;

const throttledPetcoGcRemovalCheck = _.throttle(petcoGcRemovalCheck, 2000);

function fetchInitialData() {
  return Promise.all([getUser(), siteCache(), initCashback()]).spread(
    (resp, siteAPIData, cashback) => {
      if (resp) {
        tree.set('session', _.get(resp, 'session'));
        tree.set('events', _.get(resp, 'settings.events'));
        tree.set('settings', _.get(resp, 'settings'));
        tree.set('couponsDisabledSites', _.get(resp, 'couponsDisabledSites'));
        tree.set('couponsAffiliateDisabledSites', _.get(resp, 'couponsAffiliateDisabledSites'));
        tree.set('selfStandDown', _.get(resp, 'selfStandDown'));
        tree.set('pageViewId', window.__wb_page_view_id);
        tree.set('tabId', _.get(resp, 'tabId'));
        tree.set('miniCashbackTabState', _.get(resp, 'miniCashbackTabState'));
        tree.set('notificationBackgroundOpacity', _.get(resp, 'notificationBackgroundOpacity'));
        tree.set('ebatesActivatedSites', _.get(resp, 'ebatesActivatedSites'));
        tree.set('honeyActivatedSites', _.get(resp, 'honeyActivatedSites'));
      }
      tree.merge({siteAPIData});
      tree.merge({cashback});
    }
  );
}

const CLASSIFIER_SITES_WITH_CONDITIONS = [
  {domain: 'etsy.com'},
  {
    domain: 'amazon.com',
    condition: deweyResult => {
      const isCheckoutPage = _.get(deweyResult, 'pageType') === 'checkoutPage';
      const meta = _.get(deweyResult, 'pageData.meta');
      const hasCouponMeta = meta ? _.find(meta, obj => obj.coupon_input_present === 'true') : false;
      return isCheckoutPage && hasCouponMeta;
    }
  }
];

function checkClassifierSite(domain, deweyResult) {
  const site = _.find(CLASSIFIER_SITES_WITH_CONDITIONS, el => {
    return el.domain === domain && (el.condition ? el.condition(deweyResult) : true);
  });
  return Boolean(site);
}

export async function init() {
  await fetchInitialData();
  const domain = currentDomain();
  if (window.location.href.indexOf('wikibuydemo=true') > -1) {
    setTimeout(() => {
      couponDemoApp();
    }, 500);
    return;
  }
  // Firefox blacklisted coupon sites
  if (navigator.userAgent.indexOf('Firefox') > -1 && domain.match(/eyebuydirect\.com/)) {
    return false;
  }

  getGoogleContacts({contacts: true});
  const cashback = tree.get('cashback');

  tree.set('couponsVisible', false);
  const siteAPIData = tree.get('siteAPIData');
  const initCoupons = await getInitCouponsFn(siteAPIData);
  // Pull site info again since we may have modified it in getInitCouponsFn
  // set browser action just incase the initCoupons promise never resolves

  const couponStandDownOverride =
    _.get(siteAPIData, 'siteData.coupons.tld') === 'ebay.com' &&
    _.get(siteAPIData, 'siteData.coupons.coupons.length');
  if (
    !(
      tree.get(['couponsDisabledSites', `${currentDomain()}_${tree.get('tabId')}`]) >
      moment().unix()
    ) &&
    !(tree.get(['couponsDisabledSites', `${currentDomain()}_all`]) > moment().unix())
  ) {
    if (cashback && !cashback.postCoupons && !couponStandDownOverride) {
      setBrowserAction({active: true, cashback});
    } else {
      setBrowserAction({active: true});
    }
  }
  let ogPageData;
  try {
    ogPageData = JSON.parse(sessionStorage.getItem('ogPageData'));
    if (ogPageData && ogPageData.expires < moment().unix()) {
      sessionStorage.removeItem('ogPageData');
      ogPageData = null;
    }
  } catch (e) {}
  dewey.emitter.on('result', async result => {
    throttledPetcoGcRemovalCheck(domain, result);
    if (result.callSource === 'coupons_start' && result.pageData) {
      sessionStorage.setItem(
        'ogPageData',
        JSON.stringify({
          ...result.pageData,
          expires: moment()
            .add(3, 'm')
            .unix()
        })
      );
    } else if (result.callSource === 'coupons_end') {
      const couponResult = tree.select('couponView').get('resultTemp');
      try {
        ogPageData = JSON.parse(sessionStorage.getItem('ogPageData'));
      } catch (e) {}
      sessionStorage.removeItem('ogPageData');
      const ogCartTotal = _.get(ogPageData, 'order.total');

      // Modify couponResult with data from before running
      couponResult.originalTotal = ogCartTotal || couponResult.originalTotal;

      // if (ogCartTotal && newCartTotal) {
      //   couponResult.savings = ogCartTotal - newCartTotal;
      // }

      // Modify deweyResult with data from before running
      if (couponResult.savings > 0) {
        if (_.get(result, 'pageData.products.length') > 1) {
          /*
          / If there is more than one product,
          / we can only be confident that the coupon applied
          / to a product if we see that the price on that specific
          / product was reduced.
          */
          result.pageData.products = _.map(result.pageData.products, (product, i) => {
            if (_.has(product, 'list_price') && _.has(ogPageData, `products[${i}].list_price`)) {
              const productSavings = ogPageData.products[i].list_price - product.list_price;
              if (productSavings) {
                product.coupon_savings = ogPageData.products[i].list_price - product.list_price;
              }
            }
            product.coupon_applied = couponResult.bestCoupon.code;
            return product;
          });
        } else if (_.get(result, 'pageData.products.length') === 1) {
          /*
          / If there is only one product, we can
          / be confident that the coupon had savings on that product.
          */
          result.pageData.products[0].coupon_savings = couponResult.savings;
          result.pageData.products[0].coupon_applied = couponResult.bestCoupon.code;
        }
      }

      const domain = currentDomain();

      const config = tree.get('couponsConfig');
      if (config && config.pageWasReloaded) {
        config.result = couponResult;

        // if classifier site, carry forward coupons from result to avoid losing them
        const currentCouponView = tree.get('couponView');
        const couponsFromCurrentCouponView = _.get(currentCouponView, 'resultTemp.coupons', []);
        if (CLASSIFIER_SITES.has(domain) && couponsFromCurrentCouponView.length > 0) {
          config.coupons = _.cloneDeep(couponsFromCurrentCouponView);
        }

        prepareCouponsApp(config, cashback);
      } else {
        tree.select('couponView').set('result', couponResult);
      }

      sendMetric('track', 'tryCouponsResult', {
        domain,
        triggerType: couponResult.automaticCouponsRun
          ? 'auto'
          : couponResult.autoFallback
          ? 'auto_fallback'
          : couponResult.isSiteHub
          ? 'site_hub'
          : null,
        couponScriptType: couponResult.couponScriptType,
        clickId: couponResult.clickId,
        redirectId: dashUuid(couponResult.clickId),
        couponRunId: couponResult.couponRunId,
        droppedCookie: couponResult.droppedCookie,
        cashback: couponResult.cashback,
        originalTotal: couponResult.originalTotal,
        savings: couponResult.savings || 0,
        errored: couponResult.errored,
        runTime: couponResult.runTime,
        totalCouponsTested: _.get(couponResult, 'coupons.length'),
        coupons: _.get(couponResult, 'coupons'),
        bestCoupon: _.get(couponResult, 'bestCoupon.code'),
        platform: couponResult.platform,
        currentLocation: _.pick(window.location, [
          'hash',
          'host',
          'hostname',
          'href',
          'origin',
          'pathname',
          'port',
          'search'
        ])
      });
      // TODO log the cart data with savings so we can display in webapp
      sendMetric(
        'track',
        'deweyResult',
        _.assign(result, {
          url: window.location.href,
          domain
        })
      );
    } else if (ogPageData && _.get(result, 'pageType')) {
      // init coupons asynchronously (after dewey finds a page type) if the page reloaded
      initCoupons();
    } else if (checkClassifierSite(domain, result) && !classifierFired) {
      if (_.get(result, 'pageData')) {
        if (domain === 'amazon.com') {
          await amazonClassifierLogic(result, initCoupons, cashback);
        } else {
          // init coupons asynchronously (after dewey finds page data) if it's a classifier site
          const config = await initCoupons();
          if (config) {
            classifierFired = true;
            const classifierCoupons = await couponsMessenger({
              message: 'getClassifierCodes',
              domain,
              pageData: result.pageData
            });
            if (classifierCoupons) {
              config.coupons = classifierCoupons;
            }
            prepareCouponsApp(config, cashback);
          }
        }
      }
    } else {
      const domain = currentDomain();
      if (!tree.get('cashbackVisible') && !_.get(cashback, 'postCoupons') && domain !== 'att.com') {
        // Try to load cashback notification if the coupon notification is not loaded yet.
        setTimeout(() => {
          if (!tree.get('couponsVisible')) {
            loadCashbackNotification(result);
          }
        }, 1000);
      }
    }
  });

  // TODO: move this inside of tigger, using the beforeSameTabRedirect method
  checkNordstromGuestCheckoutClickNeeded();

  // notify dewey that its coupons listener has loaded
  appLoaded('coupons');
  // init coupons synchronously only if there is no ogPageData (the page did not reload having saved the dewey result on the previous page) and it's not a classifier site;
  const isClassifierSite = checkClassifierSite(domain, tree.get('deweyResult'));
  let coupons;
  if (!isClassifierSite) {
    if (domain === 'amazon.com') {
      coupons = await initCoupons();
    } else {
      coupons = await initCoupons();
    }
  }

  const deweyResult = tree.get('deweyResult');
  const treePageData = _.get(deweyResult, 'pageData');
  if (isClassifierSite) {
    if (domain === 'amazon.com') {
      await amazonClassifierLogic(deweyResult, initCoupons, cashback);
    } else {
      if (treePageData && !classifierFired) {
        const config = await initCoupons();
        if (config) {
          classifierFired = true;
          let classifierCoupons = await couponsMessenger({
            message: 'getClassifierCodes',
            domain,
            pageData: treePageData
          });
          if (classifierCoupons) {
            config.coupons = classifierCoupons;
          }
          prepareCouponsApp(config, cashback);
        }
      }
    }
  }
  // const coupons = !CLASSIFIER_SITES.has(domain) && !ogPageData && await initCoupons();
  if (coupons && !_.get(coupons, 'disableCouponsOverride')) {
    if (!coupons.pageWasReloaded) {
      // load app asynchronously (using Dewey) if the page was reloaded
      prepareCouponsApp(coupons, cashback);
    }
  }
}

async function prepareCouponsApp(coupons, cashback) {
  const {standDown} = coupons;
  const domain = currentDomain();
  tree.set('couponView', coupons);
  const viewData = tree.get('cashbackView') || cashback;
  tree.set('cashbackView', viewData);

  if (sessionStorage.getItem('__wb_same_tab_auto')) {
    // Autocoup fallback won't run in same tab redirect because the page reloads and coupons are throttled
    // if no coupon is applied end throttling so fallback can run
    await couponsMessenger({domain, message: 'endThrottle'});
  }

  // Wait until here to check for throttle because another experience (e.g. SiteHub) may still want access to cashbackView or couponView
  const isAutoCoup = checkAutoCoupEnabled();
  let domainForThrottleCheck = domain;
  if (domain === 'amazon.com' && tree.get('deweyResult', 'pageType') === 'checkoutPage') {
    domainForThrottleCheck = 'amazon.com_checkout';
  }
  const isThrottled = await couponsMessenger({
    domain: domainForThrottleCheck,
    message: 'isThrottled',
    isAutoCoup
  });
  const seenThrottleToolTip = !!tree.get(['events', 'hasSeenCouponsThrottleToolTip']);
  const showThrottleToolTip = isThrottled && !seenThrottleToolTip && !coupons.pageWasReloaded;
  tree.select('couponView').set('showThrottleToolTip', showThrottleToolTip);

  const seenAutoCoupToolTip = !!tree.get(['events', 'hasSeenAutoCoupToolTip']);
  const showAutoCoupToolTip = !seenAutoCoupToolTip;
  tree.select('couponView').set('showAutoCoupToolTip', showAutoCoupToolTip);

  const settings = tree.get('settings');
  const showCoupons = _.has(settings, 'notificationPreferences.showCouponCodes')
    ? _.get(settings, 'notificationPreferences.showCouponCodes')
    : true;
  if ((!showCoupons || isThrottled) && !coupons.pageWasReloaded) {
    tree.set('couponsThrottled', true);
    if (!showCoupons && !isThrottled) {
      // because we only set throttled on the page's tree, this event is fired on every page load
      sendCouponsOverrideEvent({
        triggerType: isAutoCoup ? 'auto' : null,
        reason: 'coupons user preference'
      });
    }
    if (!showThrottleToolTip) {
      setBrowserAction({active: true, textOverride: `${_.get(coupons, 'coupons.length', '')}C`});
      // Only continue to load the coupons if we are going to show the throttle tooltip
      return;
    }
  } else if (showCoupons && standDown) {
    // throttled due to stand down.
    tree.set('couponsThrottled', true);
    return;
  }

  if (tree.get(['couponView', 'standDownOverride'])) {
    setBrowserAction({active: true, textOverride: `${_.get(coupons, 'coupons.length', '')}C`});
  }

  const loadOptions = {
    initialRoute: '/coupons',
    cssUrl: 'GENERATED/coupons.css',
    route: <Route path="coupons" component={Coupon} />,
    disableDelay: true
  };
  // TODO: remove after investigation
  if (domain === 'groupon.com') {
    sendMetric('track', 'foundCouponsEnd', {pageViewId: tree.get('pageViewId')});
  }

  // end TODO
  if (!tree.get('couponsVisible')) {
    // sometimes we call init coupons when dewey page refreshes. Stop the app from loading in if its there. But load state above
    tree.set('couponsVisible', true);
    loadApp(loadOptions);
  }
}

async function couponDemoApp(coupons, cashback) {
  const loadOptions = {
    initialRoute: '/coupons',
    cssUrl: 'GENERATED/coupons.css',
    route: <Route path="coupons" component={CouponDemo} />,
    disableDelay: true
  };
  tree.set('couponsVisible', true);
  loadApp(loadOptions);
}

function sendPlatformIdentifiedMetric(domain, platform) {
  sendMetric('track', 'platformIdentified', {
    domain,
    platform,
    // eslint-disable-next-line prettier/prettier
    currentLocation: _.pick(window.location, [
      'hash',
      'host',
      'hostname',
      'href',
      'origin',
      'pathname',
      'port',
      'search'
    ])
  });
}

async function getInitCouponsFn(siteAPIData) {
  const domain = _.get(siteAPIData, 'meta.domain');
  let platform;
  if (hasFeature('use_platforms')) {
    platform = getPlatform();
  }
  if (platform) {
    tree.set(['platform'], platform);
    sendPlatformIdentifiedMetric(domain, platform);
  }
  setDomain(domain);
  const shopifyDomain = getShopifyDomain(domain);
  if (shopifyDomain) {
    sendPlatformIdentifiedMetric(domain, 'Shopify');
  }
  if (_.get(siteAPIData, 'siteData.coupons.ignoreSite')) {
    return _.noop;
  }
  if (
    _.get(siteAPIData, 'siteData.coupons.type') === 'eeyore' &&
    _.get(siteAPIData, 'siteData.coupons.coupons.length') > 0
  ) {
    // No tigger or roo script but tigger enabled and has coupons object
    const identifiers = _.get(siteAPIData, 'siteData.coupons.identifiers');
    if (identifiers) {
      const deweyDoc = document;
      deweyDoc.deweyParser = $;
      deweyDoc.html = document.documentElement.innerHTML;
      const result = await dewey.evaluateIdentifierTree(identifiers, deweyDoc);
      if (result) {
        return initOnlyShowCoupons;
      }
    }
    return _.noop;
  } else if (
    _.get(siteAPIData, 'siteData.coupons.type') === 'tigger' &&
    (shopifyDomain || isTiggerSite(domain, platform))
  ) {
    if (shopifyDomain) {
      setDomain(shopifyDomain);
      if (shopifyDomain !== domain) {
        // e.g. shopify.com/${id}; we won't have pulled site data for that domain previously so we must pull it now
        // must fetch in the background

        const script = await couponsMessenger({
          message: 'makeRequest',
          reqInfo: {
            method: 'GET',
            url: `${SITE_API}/coupons?tld=${shopifyDomain}`,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        });

        _.assign(siteAPIData.siteData.coupons, {
          coupons: script.items || [],
          ignoreSite: _.isUndefined(script.ignoreSite) ? true : script.ignoreSite,
          ignoreAffiliate: _.isUndefined(script.ignoreAffiliate) ? true : script.ignoreAffiliate,
          tld: script.tld
        });
      }
      siteAPIData.siteData.coupons.shopify = true;
      siteAPIData.siteData.appliedCodeSelector = '.applied-reduction-code__information';
      await siteCache(
        _.assign(siteAPIData, {
          domain: shopifyDomain,
          setSite: true
        })
      );
    }
    return initTigger;
  } else if (_.get(siteAPIData, 'siteData.coupons.type') === 'roo') {
    return initRoo;
  } else {
    return _.noop;
  }
}

async function amazonClassifierLogic(deweyResult, initCouponsFn, cashback) {
  if (deweyResult) {
    const config = await initCouponsFn({experience: 'checkout'}); // do this before feature return to make sure userContributedCode still works
    if (!hasFeature('amz_class_on')) {
      return;
    }
    classifierFired = true;
    let classifierCoupons = await couponsMessenger({
      message: 'getClassifierCodes',
      domain: 'amazon.com',
      pageData: deweyResult.pageData,
      newRoute: true,
      pageViewId: tree.get('pageViewId')
    });
    if (classifierCoupons) {
      config.coupons = classifierCoupons;
    }
    if (classifierCoupons && classifierCoupons.length >= 1) {
      config.couponCount = classifierCoupons.length;
      prepareCouponsApp(config, cashback);
    } else {
      // do nothing
    }
  } else {
    // do nothing, we'll catch it when dewey finishes
  }
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
