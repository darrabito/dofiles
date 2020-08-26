import {React} from 'utility/css-ns';
import HeadlessCoupons from 'pages/HeadlessCoupons';
import Root from 'components/Root';
import loadApp from 'utility/loadApp';
import currentDomain from 'utility/currentDomain';
import setBrowserAction from 'messenger/outbound/setBrowserAction';
import getCurrentCouponRunResult from 'messenger/outbound/getCurrentCouponRunResult';
import getCurrentCouponRunState from 'messenger/outbound/getCurrentCouponRunState';
import markCurrentCouponRunDisplayed from 'messenger/outbound/markCurrentCouponRunDisplayed';
import couponsMessenger from 'messenger/outbound/couponsMessenger';
import siteCache from 'messenger/outbound/siteCache';
import tree from 'state';
import getUser from 'messenger/outbound/getUser';
import Promise from 'bluebird';
import _ from 'lodash';
import moment from 'moment';
import getSite from 'iv-headless-coupons';

function fetchInitialData() {
  return Promise.all([getUser()]).spread(resp => {
    if (resp) {
      tree.set('session', _.get(resp, 'session'));
      tree.set('events', _.get(resp, 'settings.events'));
      tree.set('settings', _.get(resp, 'settings'));
      tree.set('pageViewId', window.__wb_page_view_id);
      tree.set('tabId', _.get(resp, 'tabId'));
      tree.set('couponsDisabledSites', _.get(resp, 'couponsDisabledSites'));
      tree.set('couponsAffiliateDisabledSites', _.get(resp, 'couponsAffiliateDisabledSites'));
    }
  });
}

function createApp(props) {
  return (
    <Root>
      <HeadlessCoupons {...props} />
    </Root>
  );
}

async function init() {
  // const isThrottled = await couponsMessenger({domain: currentDomain(), message: 'isThrottled'});
  setBrowserAction({active: true});
  const isThrottled = false;
  if (
    tree.get(['couponsDisabledSites', `${currentDomain()}_${tree.get('tabId')}`]) >
      moment().unix() ||
    tree.get(['couponsDisabledSites', `${currentDomain()}_all`]) > moment().unix() ||
    isThrottled
  ) {
    return;
  }
  const siteData = await siteCache(location.hostname);
  const disableAffiliate = _.get(siteData, 'siteData.coupons.ignoreAffiliate');
  const cursor = tree.select('couponView');
  cursor.set('disableAffiliate', disableAffiliate);
  tree.set('siteData', siteData);
  const couponDomain = _.get(siteData, 'siteData.coupons.tld');
  const domain = _.get(siteData, 'siteData.coupons.config.r_coup.shopify')
    ? 'shopify.com'
    : couponDomain;
  const {isCheckoutURL} = getSite(domain, 'content');
  await fetchInitialData();
  // may need to check every so often on SPAs
  const isCheckout = await isCheckoutURL();
  if (isCheckout) {
    // setBrowserAction({active: true});, unnecessary if we're doing it above

    getCurrentCouponRunResult(couponDomain).then(currentCouponRun => {
      tree.set('currentCouponRun', currentCouponRun);
      markCurrentCouponRunDisplayed(couponDomain);
    });

    const currentCouponRun = await getCurrentCouponRunState(couponDomain);
    tree.set('currentCouponRun', currentCouponRun);
    const alreadyDisplayed = _.get(currentCouponRun, 'displayed');
    const runWasCanceled = _.get(currentCouponRun, 'canceled');
    const runStartTimeUnix = _.get(currentCouponRun, 'startTimestamp');
    const runIsTooOld = runStartTimeUnix && Date.now() - runStartTimeUnix > 1000 * 60 * 60 * 24;
    if (currentCouponRun && !alreadyDisplayed && !runWasCanceled && !runIsTooOld) {
      loadApp({
        initialRoute: '/headless-coupons',
        cssUrl: 'GENERATED/headlessCoupons.css',
        app: createApp({})
      });
    }
  }
}
if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
