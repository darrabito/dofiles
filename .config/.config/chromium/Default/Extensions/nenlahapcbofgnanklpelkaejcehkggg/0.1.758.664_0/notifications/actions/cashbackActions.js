import tree from 'state';
import uuid from 'node-uuid';
import moment from 'moment';
import _ from 'lodash';
import dismissCashback from 'messenger/outbound/dismissCashback';
import getCashback from 'messenger/outbound/getCashback';
import completeTooltipSteps from 'messenger/outbound/completeTooltipSteps';
import activatePinnedTab from 'messenger/outbound/activatePinnedTab';
import saveCashBackNotificationSettings from 'messenger/outbound/saveCashBackNotificationSettings';
import getCashBackNotificationSettings from 'messenger/outbound/getCashBackNotificationSettings';
import setMiniCashbackTabState from 'messenger/outbound/setMiniCashbackTabState';
import backgroundTreeSet from 'messenger/outbound/backgroundTreeSet';
import getUserCreditAmount from 'messenger/outbound/getUserCreditAmount';
import currentDomain from 'utility/currentDomain';
import getCustomAffiliateUrl from 'utility/customAffiliateUrl';
import {WIKIBUY_API} from 'constants';
import generateAffiliateUrl from 'common/utility/generateAffiliateUrl';
import dashUuid from 'common/utility/dashUuid';
import hasFeature from 'utility/hasFeature';

const cursor = tree.select('cashbackView');

export function dismiss() {
  dismissCashback();
}

export async function initCashback() {
  let cashbackResult = false;
  if (shouldPreventCashback()) {
    return false;
  }
  const cashback = await getCashback();
  if (cashback && _.get(cashback, 'reward.amount')) {
    cashbackResult = cashback;
  }
  const notificationSettings = await getCashBackNotificationSettings();
  const creditAmount = await getUserCreditAmount();

  _.set(cashback, 'user.notifications', notificationSettings);
  _.set(cashback, 'user.credit', creditAmount);
  return cashbackResult;
}

export function setSeenNotificationTooltip(type) {
  const obj = {
    [type]: Date.now()
  };
  let events = _.cloneDeep(tree.get(['events']));
  events = _.merge(events, obj);
  tree.set(['events'], events);
  completeTooltipSteps(type);
}

export function activateThroughPinnedTab({clickId, coupons, fromAutoRun} = {}) {
  const domain = currentDomain();
  tree.set(
    ['couponsAffiliateDisabledSites', `${domain}_${tree.get('tabId')}`],
    moment()
      .add(30, 'minutes')
      .unix()
  );
  const clickIdToUse = clickId || uuid.v4().replace(/-/g, '');
  const customAffiliateURL = getCustomAffiliateUrl(domain, clickIdToUse, 'cashback');
  return activatePinnedTab({
    affiliateUrl: customAffiliateURL,
    pageViewId: tree.get('pageViewId'),
    clickId: clickIdToUse,
    domain,
    coupons,
    vendorMetaId: tree.get('cashback', 'id'),
    fromAutoRun
  });
}

export function activateInCurrentTab() {
  const domain = currentDomain();
  tree.set(
    ['couponsAffiliateDisabledSites', `${domain}_${tree.get('tabId')}`],
    moment()
      .add(30, 'minutes')
      .unix()
  );
  const clickId = uuid.v4().replace(/-/g, '');
  const customAffiliateURL = getCustomAffiliateUrl(domain, clickId, 'cashback');
  let affiliateUrl;
  if (hasFeature('use_redirect_v2')) {
    window.tree = tree;
    const params = {
      destUrl: location.href,
      channel: 'cashback',
      subExperience: 'credits',
      redirectId: dashUuid(clickId),
      vendorMetaId: tree.get('cashback', 'id'),
      clickEvent: 'cashbackRedirect'
    };
    affiliateUrl = customAffiliateURL || generateAffiliateUrl({params});
  } else {
    affiliateUrl =
      customAffiliateURL ||
      `${WIKIBUY_API}/redirect?r=1&url=${encodeURIComponent(
        location.href
      )}&channel=cashback&clickId=${clickId}`;
  }
  const data = {
    affiliateUrl,
    pageViewId: tree.get('pageViewId'),
    clickId,
    domain,
    preventPinnedTab: true,
    vendorMetaId: tree.get('cashback', 'id')
  };
  // signals to standdown
  activatePinnedTab(data);
  return data;
}

export async function saveNotificationSettings(notificationSettings) {
  saveCashBackNotificationSettings(notificationSettings);
  cursor.merge(['user', 'notifications'], notificationSettings);
}

export async function setMiniCashbackTabStateAction(state) {
  setMiniCashbackTabState(state);
}

export async function backgroundTreeSetAction({path, value, persistKey}) {
  backgroundTreeSet({path, value, persistKey});
}

function shouldPreventCashback() {
  const preventURLsRegEx = [
    /weightwatchers\.com\/us\/shop/,
    /verizonwireless\.com\/od\/cust\/auth\/cart\/getCartDetails/
  ];
  return Boolean(_.find(preventURLsRegEx, regEx => regEx.test(document.URL)));
}
