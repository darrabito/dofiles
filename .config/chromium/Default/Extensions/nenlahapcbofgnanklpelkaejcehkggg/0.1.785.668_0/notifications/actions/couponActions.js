import {tryCoupons, tryAsyncCoupons, initTigger as initTiggerContent} from 'content/coupons';
import tree from 'state';
import sendMetric from 'utility/sendMetric';
import uuid from 'node-uuid';
import followAffiliateLink from 'messenger/outbound/followAffiliateLink';
import _ from 'lodash';
import hasFeature from 'utility/hasFeature';
import moment from 'moment';
import {getSavings, setConfig, isTiggerSite} from 'iv-tigger';
import siteCache from 'messenger/outbound/siteCache';
import couponsMessenger from 'messenger/outbound/couponsMessenger';
import currentDomain from 'utility/currentDomain';
import runPinnedTab from 'messenger/outbound/pinnedTab';
import dewey from 'utility/dewey';
import setBrowserAction from 'messenger/outbound/setBrowserAction';
import {SITE_API_V3, WIKIBUY_API} from 'constants';
import getCustomAffiliateUrl from 'utility/customAffiliateUrl';
import {getElement, getPromoCodeEl} from 'content/roo';
import compStateCache from 'messenger/outbound/compStateCache';
import getShopifyDomain from 'content/utility/shopify';
import getUserCoupon from 'messenger/outbound/getUserCoupon';
import isUserCouponEligible from 'messenger/outbound/isUserCouponEligible';
import $ from 'jquery';
import Promise from 'bluebird';
import completeTooltipSteps from 'messenger/outbound/completeTooltipSteps';
import parsePrice from '../content/utility/parsePrice';
import isFullAccount, {isFullCustomer} from 'utility/isFullAccount';
import {updateAutomaticCoupons} from 'actions/accountActions';
import activateCashback from 'messenger/outbound/activateCashback';
import generateAffiliateUrl from 'common/utility/generateAffiliateUrl';
import dashUuid from 'common/utility/dashUuid';
import checkSiteUserCouponCriteria from 'utility/checkSiteUserCouponCriteria';

let tryingCodes = false;
let ignoredCode;
let initiateSPAListener = true;
let checkoutURL;
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

function checkCookieOverride() {
  return currentDomain() === 'ebay.com';
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

export function throttleNotification(triedCodes) {
  const domain = currentDomain();
  if (domain === 'amazon.com') {
    if (tree.get('deweyResult', 'pageType') === 'checkoutPage') {
      couponsMessenger({domain: 'amazon.com_checkout', message: 'triedCodes'});
    } else {
      // do not throttle
    }
  } else {
    couponsMessenger({domain, message: 'triedCodes'});
  }
}

export function checkAutoCoupEnabled() {
  const domain = currentDomain();
  const hasFullAccount = isFullAccount();
  const fullCustomer = isFullCustomer();
  const settings = tree.get('settings');
  const view = tree.get('couponView');
  const autoCoupEnabled =
    _.get(view, 'autoCoupConfig.enabled') &&
    (_.get(view, 'result.automaticCouponsRun') || !_.get(view, 'result')) &&
    (!hasFeature('auth_gate_coupons') || (hasFullAccount && fullCustomer)) &&
    _.get(view, 'initOrigin') !== 'sitehub';
  let shouldRunAutoCoup = false;

  if (autoCoupEnabled) {
    if (domain === 'amazon.com') {
      if (hasFeature('a_clip_on')) {
        const signedInText = _.get(
          document.querySelector('#nav-link-accountList .nav-line-1'),
          'textContent'
        );
        const isSignedIn =
          signedInText && signedInText.match(/hello/i) && !signedInText.match(/sign in/i);
        shouldRunAutoCoup =
          isSignedIn &&
          _.get(settings, 'notificationPreferences.amazonAutomaticCouponsEnabled') !== false;
        if (!shouldRunAutoCoup && isSignedIn) {
          sendCouponsOverrideEvent({triggerType: 'auto', reason: 'auto user preference'});
        }
      }
    } else {
      // because it's not set to true by default in preferences
      shouldRunAutoCoup =
        _.get(settings, 'notificationPreferences.automaticCouponsEnabled') !== false;
      if (!shouldRunAutoCoup) {
        sendCouponsOverrideEvent({triggerType: 'auto', reason: 'auto user preference'});
      }
    }
  }
  if (sessionStorage.getItem('__wb_same_tab_auto')) {
    // turn autoCoup off for sametab fallback run
    shouldRunAutoCoup = false;
  }
  return shouldRunAutoCoup;
}

export async function sendCouponsOverrideEvent({triggerType, reason}) {
  sendMetric('track', 'couponNotificationOverride', {
    domain: currentDomain(),
    triggerType,
    show: false,
    reason,
    currentLocation: _.pick(window.location, [
      'hash',
      'host',
      'hostname',
      'href',
      'origin',
      'pathname',
      'port',
      'search'
    ]) // eslint-disable-line prettier/prettier
  });
}

// export function generateClickId() {
//   return uuid.v4().replace(/-/g, '');
// }

export async function dropCookie(clickId, fromAutoRun) {
  if (
    (!cursor.get('disableAffiliate') &&
      !tree.get(['offers', 'coupons', 'disableAffiliate']) &&
      !(
        tree.get(['couponsDisabledSites', `${currentDomain()}_${tree.get('tabId')}`]) >
        moment().unix()
      ) &&
      !(tree.get(['couponsDisabledSites', `${currentDomain()}_all`]) > moment().unix()) &&
      !(
        tree.get(['couponsAffiliateDisabledSites', `${currentDomain()}_${tree.get('tabId')}`]) >
        moment().unix()
      ) &&
      !(tree.get(['couponsAffiliateDisabledSites', `${currentDomain()}_all`]) > moment().unix())) ||
    checkCookieOverride()
  ) {
    try {
      let url;
      if (hasFeature('use_redirect_v2')) {
        const params = {
          destUrl: `http://${currentDomain()}`,
          channel: 'coupons',
          subExperience: 'coupons',
          credits: checkStandDownOverride() ? false : Boolean(tree.get('cashback')),
          redirectId: clickId,
          vendorMetaId: checkStandDownOverride() ? undefined : tree.get('cashback', 'id'),
          clickEvent: fromAutoRun ? 'couponsModalClickCta' : 'tryCodesButton'
        };
        url = getCustomAffiliateUrl(currentDomain(), clickId) || generateAffiliateUrl({params});
      } else {
        url =
          getCustomAffiliateUrl(currentDomain(), clickId) ||
          `${WIKIBUY_API}/redirect?r=1&url=${encodeURIComponent(
            `http://${currentDomain()}`
          )}&channel=coupons&clickId=${clickId}`;
      }
      if (url) {
        const pinId = 'coupons' + clickId;
        runPinnedTab({
          url,
          id: pinId,
          timeout: 10000,
          cb: {
            type: 'aff'
          }
        });
        await followAffiliateLink(url);
      }
    } catch (e) {}
  }
}

export function determineAndDropCookieAutoCoup({clickId, fromAutoRun} = {}) {
  const clickIdToUse = clickId || uuid.v4().replace(/-/g, '');
  const disableAffiliate = cursor.get('disableAffiliate');
  if (!disableAffiliate || checkCookieOverride()) {
    dropCookie(clickIdToUse, fromAutoRun);
  }
}

export function activateInCurrentTab(isCredits, {clickId, fromAutoRun, autoSavings} = {}) {
  const isSiteHub = tree.get('couponNotif') === 'siteHub';
  const domain = currentDomain();
  tree.set(
    ['couponsAffiliateDisabledSites', `${domain}_${tree.get('tabId')}`],
    moment()
      .add(30, 'minutes')
      .unix()
  );

  if (isCredits) {
    activateCashback(); // sets the domain as activated in cashbackcache
  }

  const clickIdToUse = clickId || uuid.v4().replace(/-/g, '');

  const customAffiliateURL = getCustomAffiliateUrl(
    domain,
    clickIdToUse,
    isCredits ? 'cashback' : 'coupons'
  );

  if (!autoSavings) {
    localStorage.setItem('__wb_redirecting', JSON.stringify({sameTabAuto: true, isSiteHub}));
  }
  sessionStorage.setItem('__wb_clickId', clickIdToUse);

  const couponsConfig = tree.get('couponsConfig');
  const sameTabAutoCoup =
    _.get(couponsConfig, 'affiliateLinkCurrentTab') &&
    _.get(couponsConfig, 'autoCoupConfig.enabled');
  if ((checkAutoCoupEnabled() || (isSiteHub && sameTabAutoCoup)) && !autoSavings) {
    sessionStorage.setItem('__wb_same_tab_auto', JSON.stringify({sameTabAuto: true, isSiteHub}));
  }

  if (hasFeature('use_redirect_v2')) {
    const params = {
      destUrl: location.href,
      channel: isCredits ? 'cashback' : 'coupons', // may need to change this;
      subExperience: 'coupons',
      credits: isCredits,
      redirectId: clickIdToUse,
      vendorMetaId: isCredits ? tree.get('cashback', 'id') : null,
      clickEvent: fromAutoRun ? 'couponsModalClickCta' : 'tryCodesButton'
    };
    const affiliateUrl = customAffiliateURL || generateAffiliateUrl({params});
    window.location.href = affiliateUrl;
  } else {
    window.location.href =
      customAffiliateURL ||
      `${WIKIBUY_API}/redirect?r=1&url=${encodeURIComponent(location.href)}&channel=${
        isCredits ? 'cashback' : 'coupons'
      }&clickId=${clickIdToUse}`;
  }
}

export function resetResult() {
  cursor.set('hadPreviousResult', !!cursor.get('result'));
  cursor.set('result', null);
}

export async function tryCodes({
  disableAffiliate,
  couponTryCount,
  automaticCouponsRun,
  autoFallback,
  passedInClickId,
  couponRunId,
  cashback,
  isAsyncTigger
}) {
  let sameTabAuto;
  let redirecting;
  if (sessionStorage.getItem('__wb_same_tab_auto')) {
    sameTabAuto = JSON.parse(sessionStorage.getItem('__wb_same_tab_auto'));
  } else if (sessionStorage.getItem('__wb_redirecting')) {
    redirecting = JSON.parse(sessionStorage.getItem('__wb_redirecting'));
  }

  const isSiteHub =
    tree.get('couponNotif') === 'siteHub' ||
    _.get(sameTabAuto, 'isSiteHub') ||
    _.get(redirecting, 'isSiteHub');
  tryingCodes = true;
  const clickId = passedInClickId || uuid.v4().replace(/-/g, '');
  couponRunId = couponRunId || uuid.v4();
  autoFallback = autoFallback || (sameTabAuto && !isSiteHub);

  // Cleanup same_tab_auto
  if (sessionStorage.getItem('__wb_same_tab_auto')) {
    sessionStorage.removeItem('__wb_same_tab_auto');
  }

  const domain = currentDomain();
  const droppedCookie = !disableAffiliate;
  if (!disableAffiliate || checkCookieOverride(passedInClickId)) {
    dropCookie(clickId);
  }
  sendMetric('track', 'tryCoupons', {
    domain,
    clickId: automaticCouponsRun ? null : clickId,
    redirectId: automaticCouponsRun ? null : dashUuid(clickId),
    couponRunId,
    droppedCookie,
    cashback,
    triggerType: automaticCouponsRun
      ? 'auto'
      : autoFallback
      ? 'auto_fallback'
      : isSiteHub
      ? 'site_hub'
      : null,
    couponScriptType: isAsyncTigger ? 'asyncTigger' : 'tigger',
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

  const siteAPIData = await siteCache(domain);
  await dewey.run({callSource: 'coupons_start'});
  const couponStartTime = Date.now();
  const isShopifySite =
    _.get(siteAPIData, 'siteData.coupons.shopify') || Boolean(getShopifyDomain(currentDomain()));
  const userCouponsEnabledForSite = _.get(siteAPIData, 'siteData.coupons.userCouponsEnabled');

  const shouldFetchUserCoupon =
    userCouponsEnabledForSite && checkSiteUserCouponCriteria(domain, tree.get('deweyResult'));

  const userCoupon = shouldFetchUserCoupon
    ? await getUserCoupon({
        SITE_API_V3,
        domain
      })
    : null;
  if (userCoupon) {
    let code = userCoupon.code;
    if (code && code.match(/:\d{4,8}$/)) {
      code = code.replace(/:\d{4,8}$/, '');
    }
    await couponsMessenger({
      message: 'cacheGc',
      gcLastFour: code.substring(code.length - 4),
      orderTotalBeforeApply: tree.get(['deweyResult', 'pageData', 'order', 'total']),
      domain
    }); // petco
    sendMetric('track', 'userCouponReceived', {
      domain,
      currentLocation: _.pick(window.location, [
        'hash',
        'host',
        'hostname',
        'href',
        'origin',
        'pathname',
        'port',
        'search'
      ]),
      coupon: code,
      userCouponObj: JSON.stringify(userCoupon)
    });
  }

  const platform = tree.get(['platform']);
  const coupons = automaticCouponsRun
    ? _.take(cursor.get('coupons'), couponTryCount)
    : cursor.get('coupons');
  let result;
  if (isAsyncTigger) {
    result =
      (await tryAsyncCoupons(
        isShopifySite ? 'shopify.com' : currentDomain(),
        coupons,
        userCoupon,
        couponsMessenger,
        {automaticCouponsRun, autoFallback, platform, isSiteHub, couponRunId, cashback}
      )) || {};
  } else {
    result =
      (await tryCoupons(
        isShopifySite ? 'shopify.com' : currentDomain(),
        coupons,
        userCoupon,
        couponsMessenger,
        {automaticCouponsRun, autoFallback, platform, isSiteHub, couponRunId, cashback}
      )) || {};
  }
  if (_.get(result, 'bestCoupon')) {
    try {
      const code = _.get(result, 'bestCoupon.code');
      if (code) {
        ignoredCode = code.toLowerCase();
      }
    } catch (e) {}
  }
  result.duration = new Date().getTime() - couponStartTime;
  if (result) {
    if (result.affiliateRedirect || result.pageReload) {
      pageStorage.setItem('couponRun', JSON.stringify({clickId, droppedCookie, result}));
    }
    if (result.affiliateRedirect) {
      const url =
        getCustomAffiliateUrl(currentDomain(), clickId) ||
        `${WIKIBUY_API}/redirect?r=1&url=${encodeURIComponent(
          `http://${currentDomain()}`
        )}&channel=coupons&clickId=${clickId}`;

      if (url) {
        window.location.href = url;
        return {changePageLocation: true};
      }
    } else if (result.pageReload) {
      return {pageReload: true};
    }
    await handleResult({result, droppedCookie, clickId});
    return result;
  } else {
    return {
      finishWithoutResult: true
    };
  }
}

export function handleResult({result, droppedCookie, clickId}) {
  cursor.set('resultTemp', _.assign(result, {droppedCookie, clickId}));
  throttleNotification();
  tryingCodes = false;
  return dewey.run({callSource: 'coupons_end', siteData: tree.get('siteAPIData').siteData});
}

export function claimCredit() {
  cursor.set('creditClaimed', true);
}

export async function viewAllCodes() {
  sendMetric('track', 'viewAllCodes', {
    domain: currentDomain(),
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

export async function copyCode(code) {
  const clickId = uuid.v4().replace(/-/g, '');
  const disableAffiliate = cursor.get('disableAffiliate');
  const ignoreAffiliate = tree.get('siteAPIData', 'siteData', 'coupons', 'ignoreAffiliate');
  if (
    disableAffiliate === false ||
    (disableAffiliate === undefined && !ignoreAffiliate) ||
    checkCookieOverride()
  ) {
    dropCookie(clickId);
  }
  sendMetric('trackClick', 'copyCouponCode', code, {
    domain: currentDomain(),
    pagePath: location.pathname,
    clickId
  });
}

export async function initTigger(options = {}) {
  let config = false;
  let timeout;
  const domain = currentDomain();
  const {experience} = options;

  const siteAPIData = await siteCache(domain);
  let {coupons, ignoreAffiliate} = _.get(siteAPIData, 'siteData.coupons', {});

  const standDownOverride = coupons && coupons.length && checkStandDownOverride();
  const disableCreditsOverride = coupons && coupons.length && domain === 'ebay.com';
  const disableCouponsOverride = !(coupons && coupons.length) && domain === 'ebay.com';
  let disableAffiliate = false;

  if (standDownOverride) {
    setBrowserAction({active: true});
  }

  if (
    (ignoreAffiliate ||
      hasFeature('ext_tigger_af_off') ||
      tree.get(['couponsAffiliateDisabledSites', `${domain}_${tree.get('tabId')}`]) >
        moment().unix() ||
      tree.get(['couponsAffiliateDisabledSites', `${domain}_all`]) > moment().unix()) &&
    !standDownOverride
  ) {
    cursor.set('disableAffiliate', true);
    disableAffiliate = true;
  }
  let couponCount = coupons && coupons.length;
  setConfig({
    LOG_FN: (name, data) => {
      sendMetric('track', name, data);
    }
  });

  if (hasFeature('user_contributed_codes_tigger')) {
    const script = _.get(siteAPIData, 'siteData.coupons.script');
    if (script) {
      if (domain === 'etsy.com') {
        setupEtsyCouponListener(script);
      } else if (domain === 'amazon.com') {
        setupAmazonCouponListener(script);
      } else {
        setupCouponListener(script);
      }
    }
  }

  let estimatedRunTime;
  let pageCoupons;
  let tiggerFinished;
  let backoff = 500;
  const platform = tree.get('platform');

  const couponExperence = await userCouponExperence(siteAPIData, domain);

  while (!tiggerFinished) {
    const resp = await initTiggerContent(
      _.get(siteAPIData, 'siteData.coupons.shopify') ? 'shopify.com' : domain,
      coupons,
      {platform, experience: couponExperence || experience}
    );
    estimatedRunTime = resp.estimatedRunTime;
    pageCoupons = resp.pageCoupons;
    tiggerFinished = estimatedRunTime !== undefined;
    if (Boolean(resp.error)) {
      await cancelableDelay(backoff, timeout);
    } else {
      clearInterval(timeout);
    }
    backoff *= 2;
    if (backoff > 5000) {
      backoff = 5000;
    }
  }
  // Use estimatedRunTime to determine whether it's a checkout page
  checkoutURL = window.location.href;
  if (initiateSPAListener && hasFeature('spa_prompt')) {
    dewey.emitter.on('result', listenForSPACheckoutPath);
    initiateSPAListener = false;
  }
  let previousRun;
  const standDown =
    (tree.get(['couponsDisabledSites', `${domain}_${tree.get('tabId')}`]) > moment().unix() ||
      tree.get(['couponsDisabledSites', `${domain}_all`]) > moment().unix()) &&
    !standDownOverride;

  if (estimatedRunTime) {
    sendMetric('track', 'couponCheck', {
      domain,
      pagePath: location.pathname
    });
    if (standDown) {
      disableAffiliate = true;
    }

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
        delete previousRun.result.pageReload;
        pageStorage.removeItem('couponRun');
      }
    } catch (e) {
      // log('tiggerScriptError', {error: e, domain});
      pageStorage.removeItem('couponRun');
    }

    if (pageCoupons) {
      coupons = [];
      couponCount = pageCoupons;
    }
    config = {
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
  }

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

// set this in global scope so we can reset the exp backoff when URL changes
let spaBackoff = 500;
async function listenForSPACheckoutPath(result) {
  if (
    _.get(result, 'callSource') === 'internal' &&
    _.get(result, 'deweyTrigger.trigger') === 'url'
  ) {
    spaBackoff = 500;
    if (checkoutURL && checkoutURL !== _.get(result, 'url')) {
      checkoutURL = null;
      if (!tree.get('shouldShowSPAPrompt')) {
        tree.set('shouldHidePrompt', true);
      }
      await waitForTiggerCheckoutURL();
      tree.set('shouldShowSPAPrompt', true);
    }
  }
}

async function waitForTiggerCheckoutURL() {
  let timeout;
  const domain = currentDomain();
  const siteAPIData = await siteCache(domain);
  let {coupons} = _.get(siteAPIData, 'siteData.coupons', {});
  let estimatedRunTime;
  let tiggerFinished;
  const platform = tree.get('platform');
  while (!tiggerFinished) {
    const resp = await initTiggerContent(
      _.get(siteAPIData, 'siteData.coupons.shopify') ? 'shopify.com' : domain,
      coupons,
      {platform}
    );
    estimatedRunTime = resp.estimatedRunTime;
    tiggerFinished = estimatedRunTime !== undefined;
    if (Boolean(resp.error)) {
      await cancelableDelay(spaBackoff, timeout);
    } else {
      clearInterval(timeout);
    }
    spaBackoff *= 2;
    if (spaBackoff > 5000) {
      spaBackoff = 5000;
    }
  }
  checkoutURL = window.location.href;
  tree.unset('shouldHidePrompt');
  return;
}

async function cancelableDelay(interval, timeout) {
  return new Promise(resolve => {
    timeout = setTimeout(resolve, interval);
  });
}

export async function initOnlyShowCoupons() {
  const domain = currentDomain();
  const siteAPIData = await siteCache(domain);
  const {coupons, ignoreAffiliate} = _.get(siteAPIData, 'siteData.coupons', {});
  let disableAffiliate = false;
  if (
    ignoreAffiliate ||
    hasFeature('ext_tigger_af_off') ||
    tree.get(['couponsAffiliateDisabledSites', `${domain}_${tree.get('tabId')}`]) >
      moment().unix() ||
    tree.get(['couponsAffiliateDisabledSites', `${domain}_all`]) > moment().unix()
  ) {
    cursor.set('disableAffiliate', true);
    disableAffiliate = true;
  }
  if (
    tree.get(['couponsDisabledSites', `${domain}_${tree.get('tabId')}`]) > moment().unix() ||
    tree.get(['couponsDisabledSites', `${domain}_all`]) > moment().unix()
  ) {
    disableAffiliate = true;
    return false;
  }
  const couponCount = coupons && coupons.length;
  const config = {
    coupons,
    estimatedRunTime: 0,
    disableAffiliate,
    couponCount,
    pageWasReloaded: false,
    noScript: true
  };
  tree.set('couponsConfig', config);
  return config;
}

export async function onChooseCouponPref(value, label, e) {
  e.preventDefault();
  e.stopPropagation();
  let ctaButtonText;
  const settings = tree.get('settings');
  const view = tree.get('couponView');

  try {
    ctaButtonText = document
      .querySelector('div[style="all: initial;"]')
      .shadowRoot.querySelector('.wbext-primary-btn-large').textContent;
  } catch (e) {
    // do nothing
  }
  sendMetric('trackClick', 'couponsModalChangeConfig', 'checkbox', {
    domain: currentDomain(),
    pagePath: location.pathname,
    settingNew: value,
    settingWas: _.get(settings, 'notificationPreferences.automaticCouponsEnabled'),
    runDuration: _.get(view, 'result.runTime'),
    savings: _.get(view, 'result.savings'),
    bestCoupon: _.get(view, 'result.bestCoupon.code'),
    coupons: _.get(view, 'result.coupons'),
    ctaText: ctaButtonText,
    triggerType: 'auto'
  });
  const startingNotificationPreferences = _.get(settings, 'notificationPreferences', {});
  let notificationPreferences;
  if (currentDomain() === 'amazon.com') {
    notificationPreferences = _.assign({}, startingNotificationPreferences, {
      amazonAutomaticCouponsEnabled: value
    });
  } else {
    notificationPreferences = _.assign({}, startingNotificationPreferences, {
      automaticCouponsEnabled: value
    });
  }
  await updateAutomaticCoupons({notificationPreferences});
}

export async function updateEmailSubscriptions(subscriptions) {
  return await couponsMessenger({message: 'updateSubscriptions', subscriptions});
}

function getNearestFamilyMember(el, selector) {
  if (el) {
    if (el.matches(selector)) {
      return el;
    } else {
      const descendant = el.querySelector(selector);
      if (descendant) {
        return descendant;
      } else {
        return el.parentElement ? getNearestFamilyMember(el.parentElement, selector) : null;
      }
    }
  }
}

async function sendEtsyUserContributedCode(e, script, promoApplyEl) {
  const domain = currentDomain();
  if (!tryingCodes) {
    let promoInputEl;
    if (promoApplyEl) {
      promoInputEl = getNearestFamilyMember(promoApplyEl, script.promoInputSelector);
      setTimeout(() => setupEtsyCouponListener(script), 1500); // this can sometimes lead to duplicate events
    } else {
      promoInputEl = getPromoCodeEl(script);
    }
    if (promoInputEl) {
      const code = promoInputEl.value;
      if (_.get(code, 'length') && code.toLowerCase() !== ignoredCode) {
        let event = 'userContributedCode';
        const honeyIsRunning = await compStateCache({
          action: 'getHoneyState',
          comp: 'honey'
        });
        if (honeyIsRunning) {
          event = 'userContributedCodeH';
        }
        let seller;
        try {
          const sellerSelector = script.promoRemoveAction; // this way we can edit it on the fly
          const nearestSeller = getNearestFamilyMember(promoApplyEl, sellerSelector);
          seller = nearestSeller.textContent.trim();
        } catch (e) {
          // do nothing
        }
        sendMetric('track', event, {
          domain,
          pagePath: location.pathname,
          code,
          seller
        });
      }
    }
  }
}

async function setupEtsyCouponListener(script) {
  try {
    if (script.promoApplyAction) {
      const promoApplyElements = document.querySelectorAll(script.promoApplyAction);
      _.forEach(promoApplyElements, promoApplyEl => {
        promoApplyEl.addEventListener('click', e =>
          sendEtsyUserContributedCode(e, script, promoApplyEl)
        );
      });
    }
  } catch (e) {}
}

function getAmazonCart() {
  // Grab hidden inputs that are next to each item in the cart and that provide specific asins and seller ids
  const hiddenInputs = Array.from($('[name="dupOrderCheckArgs"]'));

  // Build shopping cart state:
  // {
  //   [asin: string]: {
  //     asin: string,
  //     sellerId: string,
  //     isPromoApplied: boolean,
  //     price: number
  //   }
  // }
  return hiddenInputs.reduce((memo, input) => {
    const cartItem = {};

    // Grab asins and seller ids from inputs
    const values = input.value.split('|');
    cartItem.asin = values[0];
    cartItem.sellerId = values[3];

    // Determine if promo has been applied by looking for specific text in cart item element,
    // which is the element previous to the hidden element.
    const $prev = $(input).prev();
    cartItem.isPromoApplied =
      !!$prev.find(':contains("See order summary for discounts applied")').length ||
      !!$prev.find(':contains("discount applied")').length;

    cartItem.price = parsePrice($prev.find('.a-color-price .a-text-bold').text());

    memo[cartItem.asin] = cartItem;
    return memo;
  }, {});
}

async function setupAmazonCouponListener(script) {
  _setupAmazonCouponListener(script);
  let lastHref = window.location.href;
  setInterval(async () => {
    const currentHref = window.location.href;
    if (lastHref !== currentHref) {
      lastHref = currentHref;
      // Wait for animations to be done as the page transitions to reflect new href
      await Promise.delay(1000);
      _setupAmazonCouponListener(script);
    }
  }, 500);
}

async function _setupAmazonCouponListener(script) {
  function getTotal() {
    return parsePrice(getElement(script.cartTotalSelector).innerText);
  }

  if (script.promoApplyAction) {
    const promoApplyElement = getElement(script.promoApplyAction);

    if (promoApplyElement) {
      let timeout;
      promoApplyElement.addEventListener('click', async e => {
        try {
          const promoInputEl = getPromoCodeEl(script);
          const code = promoInputEl.value;
          if (code) {
            // Cancel the previous total observer to prevent it's associated code
            // from potentially getting credit for savings added by this newly entered code.
            clearInterval(timeout);

            // Grab total before promo is applied
            const total = getTotal();

            // Grab cart state before promo is applied
            const beforeCart = getAmazonCart();

            // Wait for Amazon network request and spinner to appear
            await Promise.delay(500);

            await Promise.race([
              // Wait for the loading/spinners to disappear
              new Promise(resolve => {
                try {
                  timeout = setInterval(() => {
                    try {
                      if (
                        // Non-prime users
                        !$('.loading-spinner-blocker:visible').length &&
                        // Prime users
                        !$('.section-overwrap:visible').length
                      ) {
                        resolve();
                      }
                    } catch (e) {}
                  }, 10);
                } catch (e) {}
              }),
              // Stop waiting after 20 seconds
              Promise.delay(20000)
            ]);

            clearInterval(timeout);

            // Grab total after promo is applied
            const newTotal = getTotal();

            const afterCart = getAmazonCart();

            // Find the asin that was affected by the promo
            const updatedAsin = Object.keys(beforeCart).reduce((memo, asin) => {
              if (
                // Asin didn't have promo applied before
                !beforeCart[asin].isPromoApplied &&
                // Asin now has promo applied
                afterCart[asin] &&
                afterCart[asin].isPromoApplied
              ) {
                return asin;
              }
              return memo;
            }, '');

            const item = afterCart[updatedAsin];
            let seller, productPrice, product;
            if (item) {
              seller = item.sellerId;
              productPrice = beforeCart[updatedAsin].price || 0;
              product = updatedAsin;
            }

            sendMetric('track', 'userContributedCode', {
              domain: currentDomain(),
              pagePath: location.pathname,
              code,
              savings: (total || 0) - (newTotal || 0),
              productPrice,
              seller,
              product
            });
          }
        } catch (e) {}
      });
    }
  }
}

async function setupCouponListener(script) {
  try {
    if (script.promoApplyAction) {
      const promoApplyElement = getElement(script.promoApplyAction);
      if (promoApplyElement) {
        promoApplyElement.addEventListener('click', async e => {
          if (!tryingCodes) {
            const promoInputEl = getPromoCodeEl(script);
            if (promoInputEl) {
              const code = promoInputEl.value;
              if (_.get(code, 'length') && code.toLowerCase() !== ignoredCode) {
                // Fire an event
                const domain = currentDomain();
                let event = 'userContributedCode';
                const honeyIsRunning = await compStateCache({
                  action: 'getHoneyState',
                  comp: 'honey'
                });
                if (honeyIsRunning) {
                  event = 'userContributedCodeH';
                }
                sendMetric('track', event, {
                  domain,
                  pagePath: location.pathname,
                  code
                });
              }
            }
          }
        });
      }
    }
  } catch (e) {}
}

const GIFTCARD_DOMAINS = ['petco.com', 'officedepot.com'];

async function userCouponExperence(siteAPIData, domain) {
  const userCouponsEnabledForSite = _.get(siteAPIData, 'siteData.coupons.userCouponsEnabled');
  const userCouponEnabled = userCouponsEnabledForSite
    ? await isUserCouponEligible({
        SITE_API_V3,
        domain
      })
    : undefined;
  if (userCouponEnabled) {
    if (GIFTCARD_DOMAINS.includes(domain)) {
      return 'giftcard';
    }

    return 'user_coupons';
  }
}
