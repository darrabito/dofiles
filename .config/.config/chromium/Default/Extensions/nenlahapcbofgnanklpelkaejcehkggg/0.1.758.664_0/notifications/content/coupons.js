import {initSite, tryCoupons as tryTigger} from 'iv-tigger';
import _ from 'lodash';

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
