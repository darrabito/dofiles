import {initSite, tryCoupons as tryTigger} from 'iv-tigger';
import _ from 'lodash';
import {run} from '@c1/async-tigger-client/target';

const affiliateRedirectSites = new Set([
  'rosewholesale.com'
]);

const sessionStorageHostnames = {
  'www.carters.com': true, // localStorage can get wiped
  'www.oshkosh.com': true // localStorage can get wiped
};

export async function initTigger(domain, coupons, options) {
  let result;
  try {
    result = await initSite(domain, coupons, options);
  } catch (e) {
    result = {error: 'Tigger internal error', message: e.message};
  }
  return result;
}

export async function tryCoupons(domain, coupons, userCoupon, couponsMessenger, config) {
  const {automaticCouponsRun, autoFallback, platform, isSiteHub, couponRunId, cashback} = config;
  let result;
  try {
    result = await tryTigger(domain, _.cloneDeep(coupons), userCoupon, couponsMessenger, {
      automaticCouponsRun,
      autoFallback,
      platform,
      isSiteHub,
      couponRunId,
      cashback
    });
  } catch (e) {
    result = {error: 'Tigger internal error', message: e.message};
    throw e;
  }
  return result;
}

export async function tryAsyncCoupons(domain, coupons, userCoupon, couponsMessenger, config = {}) {
  const {automaticCouponsRun, autoFallback, platform, isSiteHub, couponRunId, cashback} = config;
  const shouldMakeBgRequests = (couponsMessenger !== 'safari');
  // we pass in the string 'safari' as couponsMessenger in Safari so we know not to worry about making these requests in the background

  try {
    const startTime = new Date().getTime();

    if (userCoupon) {
      const domainsToReplaceDummyCode = {
        'zoro.com': true,
        'jet.com': true,
        'focuscamera.com': true,
        'chewy.com': true
      };
      if (domainsToReplaceDummyCode[domain]) {
        // replace code WIKIBUY with user specific code - if WIKIBUY isn't sent down, add user specific code
        const wikibuyCodeIndex = _.findIndex(coupons, coupon => coupon.code === 'WIKIBUY');
        if (wikibuyCodeIndex >= 0) {
          coupons[wikibuyCodeIndex] = _.clone(userCoupon);
        } else {
          coupons.push(_.clone(userCoupon));
        }
      } else {
        coupons.pop();
        // clone userCoupon so its 'code' property doesn't get overwritten in formatOffers (can break subsequent runs)
        coupons.push(_.clone(userCoupon));
      }
    }

    // let makeBgRequest;
    // if (shouldMakeBgRequests) {
    //   makeBgRequest = data => couponsMessenger({
    //     message: 'makeRequest',
    //     reqInfo: data
    //   });
    // } else {
    //   // don't actually try to make background requests in Safari
    //   makeBgRequest = (data) => {
    //     const {method, url, reqData, headers} = data;
    //     return xhr(method, url, reqData, headers);
    //   };
    // }
    // let scrapeCodes = false;
    // if (site.scrape && !automaticCouponsRun) {
    //   scrapeCodes = await site.scrape(makeBgRequest);
    //   coupons = _.uniqBy([...coupons, ...scrapeCodes], 'code');
    // }
    // const runFn = automaticCouponsRun ? (site.autoRun || site.run) : site.run;
    const result = await run(coupons)
    // if (scrapeCodes) {
    //   result.scrapedCodes = scrapeCodes;
    // }
    result.runTime = new Date().getTime() - startTime;
    result.affiliateRedirect = affiliateRedirectSites.has(domain);
    result.automaticCouponsRun = automaticCouponsRun;
    result.autoFallback = autoFallback;
    // if (site.platform) {
    //   result.platform = site.platform;
    // }
    result.cashback = cashback;
    result.isSiteHub = isSiteHub;
    result.couponRunId = couponRunId;
    result.couponScriptType = 'asyncTigger';
    if (result.pageReload || result.affiliateRedirect) {
      if (sessionStorageHostnames[window.location.hostname]) {
        sessionStorage.setItem('beforeReloadResult', JSON.stringify(result));
      } else {
        localStorage.setItem('beforeReloadResult', JSON.stringify(result));
      }
    }
    result.errored = false;
    if (_.some(result.coupons, coupon => !_.isNumber(coupon.savings) || _.isNaN(coupon.savings))) {
      setTimeout(() => {
        console.log('tiggerScriptError', {error: {stack: 'Invalid savings\n'}, url: document.URL});
      });
    }
    return result;
  } catch (e) {
    console.log('tiggerScriptError', {error: e, url: document.URL});
    if (__ENV__ === 'local') {
      console.log('TIGGER ERROR:', e);  // eslint-disable-line no-console
    }
    return {errored: true};
  }
}

export async function getSavings(siteData) {
  try {
    if (sessionStorageHostnames[window.location.hostname]) {
      const {savings} = JSON.parse(sessionStorage.getItem('beforeReloadResult'));
      sessionStorage.removeItem('beforeReloadResult');
      return {savings, originalTotal: -1};
    }
    const {savings} = JSON.parse(localStorage.getItem('beforeReloadResult'));
    localStorage.removeItem('beforeReloadResult');
    return {savings, originalTotal: -1};
  } catch (e) {
    console.log('pageDataError', {error: e, domain: siteData.domain});
  }
}
