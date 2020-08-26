import getPreferences from 'cache/preferencesCache';
import {updatePreferences} from 'api/preferences';
import _ from 'lodash';
import {reloadSetting} from 'storage/settings';
import {SITE_API_V3} from 'constants';
import fetchJSON from 'utility/fetchJSON';
import xhr from 'utility/xhr';
import LRU from 'lru-cache';

const domainTimers = {};

const TEN_MINUTES = 1000 * 60 * 10;

const gcCache = LRU({
  max: 15,
  maxAge: 1000 * 60 * 60 * 1 // 1 hour
});

export default async (data, tab) => {
  const {
    domain,
    message,
    subscriptions,
    pageData,
    isAutoCoup,
    throttleDurationMs,
    newRoute,
    gcLastFour,
    orderTotalBeforeApply,
    pageViewId
  } = data;
  if (message === 'isThrottled' || message === 'checkThrottled') {
    if (domainTimers[domain]) {
      const throttleDurationToUse = throttleDurationMs || TEN_MINUTES;
      if (domainTimers[domain] + throttleDurationToUse > new Date().getTime()) {
        return true;
      } else {
        delete domainTimers[domain];
      }
    }
    return false;
  } else if (message === 'triedCodes' || message === 'throttle') {
    domainTimers[domain] = new Date().getTime();
  } else if (message === 'endThrottle') {
    delete domainTimers[domain];
  } else if (message === 'updateSubscriptions') {
    const prefs = _.cloneDeep(await getPreferences());
    const emailPrefs = prefs.emailPreferences;
    emailPrefs.coupons.domainSubscriptions = subscriptions;
    prefs.emailPreferences.coupons.domainSubscriptions = subscriptions;
    const success = await updatePreferences({emailPreferences: emailPrefs});
    if (success) {
      await reloadSetting();
      return success;
    }
  } else if (message === 'getClassifierCodes') {
    // TODO: cache this
    const endpoint = newRoute
      ? `${SITE_API_V3}/coupon_classifier/${domain}`
      : `${SITE_API_V3}/site/${domain}/coupon`;
    const res = await fetchJSON(endpoint, {
      body: JSON.stringify({pageData, pageViewId}),
      method: 'POST'
    });
    return _.get(res, 'items.length') ? res.items : null;
  } else if (message === 'makeRequest') {
    const {method, url, reqData, headers} = data.reqInfo;
    const resp = await xhr(method, url, reqData, null, headers);
    return resp;
  } else if (message === 'cacheGc') {
    gcCache.set(domain, {gcLastFour, orderTotalBeforeApply});
  } else if (message === 'getCachedGc') {
    return gcCache.get(domain);
  }
};
