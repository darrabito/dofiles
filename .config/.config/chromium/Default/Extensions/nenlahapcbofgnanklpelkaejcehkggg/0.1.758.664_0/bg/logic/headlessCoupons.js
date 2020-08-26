import getSite from 'iv-headless-coupons';
import _ from 'lodash';
import {default as getSiteData} from 'cache/siteCache';
import {track} from 'utility/analytics';
import hasFeature from 'utility/hasFeature';
import uuid from 'node-uuid';

const currentRunMap = new Map();
const cartListeners = [];

async function initCartListener(domain, options = {}, callback) {
  const cacheKey = options.cacheKey;
  const {maxCartSize} = options;
  const {setupCartListener, CouponRun} = getSite(domain, 'bg');
  const shouldLog = hasFeature('local_log');
  setupCartListener(
    options.urlFilter,
    _.debounce((e, triggerPageUrl) => {
      callback({
        testCoupons: async (coupons, opts) => {
          const triggerRequestUrl = _.get(e, 'url');
          const currentRun = currentRunMap.get(cacheKey);
          if (currentRun && currentRun.state.running) {
            await currentRun.cancel();
          }
          const runId = uuid.v4();
          track('robocoupRunStart', {
            domain: cacheKey,
            triggerRequestUrl,
            triggerPageUrl,
            robocoupRunId: runId
          });
          const baseState = {runId, maxCartSize};
          const couponRun = new CouponRun(coupons, _.assign(options, opts, {shouldLog}), baseState);
          currentRunMap.set(cacheKey, couponRun);
          await couponRun.state.resultPromise;
          return couponRun; // state.resultPromise should be awaited where this is used
        }
      });
    }, options.debounceDelayTimeMs || 1000),
    shouldLog
  );
  cartListeners.push(cacheKey);
}
function isShopify(siteData) {
  return Boolean(_.get(siteData, 'siteData.coupons.config.r_coup.shopify'));
}
function getCartListenerOptions(siteData) {
  const couponDomain = _.get(siteData, 'siteData.coupons.tld');
  const headlessConfig = _.get(siteData, 'siteData.coupons.config.r_coup');
  return {
    urlFilter: _.get(headlessConfig, 'urlFilter') || `*://*.${couponDomain}/*`,
    domain: _.get(headlessConfig, 'apiDomain') || couponDomain || undefined,
    cacheKey: couponDomain,
    debounceDelayTimeMs: _.get(headlessConfig, 'debounceDelayTimeMs'),
    maxCartSize: _.get(headlessConfig, 'maxCartSize') || 15
  };
}

export async function initHeadlessCoupons(domain) {
  const originalDomain = domain;
  const siteData = await getSiteData(domain);
  domain = isShopify(siteData) ? 'shopify.com' : domain;
  const listenerOptions = getCartListenerOptions(siteData);
  const allCoupons = _.get(siteData, 'siteData.coupons.coupons');
  const couponCount = _.get(siteData, 'siteData.coupons.config.r_coup.codeCount', 5);
  const coupons = _.take(_.cloneDeep(allCoupons), couponCount);
  if (
    coupons &&
    coupons.length &&
    cartListeners &&
    cartListeners.indexOf(listenerOptions.cacheKey) === -1
  ) {
    initCartListener(domain, listenerOptions, async ({testCoupons}) => {
      const result = await testCoupons(coupons, {autoApplyBestCoupon: true});
      const runWasInterrupted = _.get(result, 'state.canceled');
      let interruptionReason;
      if (runWasInterrupted) {
        interruptionReason = _.get(result, 'state.cartSizeOverMax') ? 'cart_size' : 'new_run';
      }
      track('robocoupRunCompletion', {
        domain: originalDomain,
        // if the run has been canceled, it won't have 'duration' set
        runDurationMs:
          _.get(result, 'state.couponResult.duration') ||
          Date.now() - _.get(result, 'state.couponResult.timeStamp'),
        requestCount: _.get(result, 'state.requestCount'),
        runWasInterrupted,
        savings: _.get(result, 'state.couponResult.savings'),
        coupons: _.get(result, 'state.couponResult.offers'),
        bestCoupon: _.get(result, 'state.couponResult.bestCoupon.code'),
        autoApplyBestCoupon: _.get(result, 'options.autoApplyBestCoupon', false),
        robocoupRunId: _.get(result, 'state.runId'),
        cartSize: _.get(result, 'state.cartSize'),
        interruptionReason
      });
    });
  }
}
export function getCurrentCouponRunState(domain) {
  const currentRun = currentRunMap.get(domain);
  if (currentRun) {
    return currentRun.state;
  }
}
export async function getCurrentCouponRunResult(domain) {
  const currentRun = currentRunMap.get(domain);
  if (currentRun && currentRun.state) {
    const result = await currentRun.state.resultPromise;
    return {
      ...currentRun.state,
      ...(result || {})
    };
  }
  // [TODO] should we start a run here?
}

export async function markCurrentCouponRunDisplayed(domain) {
  const currentRun = currentRunMap.get(domain);
  _.set(currentRun, 'state.displayed', true);
}
