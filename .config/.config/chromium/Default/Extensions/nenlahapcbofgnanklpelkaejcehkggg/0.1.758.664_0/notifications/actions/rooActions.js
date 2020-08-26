import {
  getTotal,
  applyCode,
  isCouponPage,
  removePrevious,
  getElement,
  getPromoCodeEl,
  runAction
} from 'content/roo';
import tree from 'state';
import sendMetric from 'utility/sendMetric';
import uuid from 'node-uuid';
import _ from 'lodash';
import hasFeature from 'utility/hasFeature';
import currentDomain from 'utility/currentDomain';
import siteCache from 'messenger/outbound/siteCache';
import rooMessenger from 'messenger/outbound/rooPouch';
import moment from 'moment';
import {handleResult, dropCookie} from './couponActions';
import delay from 'content/roo/utility/delay';
import dewey from 'utility/dewey';
import compStateCache from 'messenger/outbound/compStateCache';
import dashUuid from 'common/utility/dashUuid';

let tryingCodes = false;
const cursor = tree.select('couponView');
const onTryCode = code => cursor.set('currentCouponCode', code);

export async function cancelRoo() {
  sendMetric('track', 'rooCancelled', {
    domain: currentDomain(),
    url: document.URL
  });
  await rooMessenger({action: 'cancel'});
  tryingCodes = false;
}

export async function tryCodes({
  disableAffiliate,
  ignoreCancelled,
  couponTryCount,
  automaticCouponsEnabled,
  passedInClickId,
  couponRunId,
  cashback
}) {
  tryingCodes = true;
  const isSiteHub = tree.get('couponNotif') === 'siteHub';
  const clickId = passedInClickId || uuid.v4().replace(/-/g, '');
  const domain = currentDomain();
  const droppedCookie = !disableAffiliate;
  if (!disableAffiliate) {
    dropCookie(clickId);
  }
  sendMetric('track', 'tryCoupons', {
    domain,
    clickId,
    redirectId: dashUuid(clickId),
    couponRunId,
    cashback,
    droppedCookie,
    triggerType: isSiteHub ? 'site_hub' : null,
    couponScriptType: 'roo',
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
  const couponStartTime = new Date().getTime();
  const script = _.get(siteAPIData, 'siteData.coupons.script');
  // change it to be more flexible
  const coupons = automaticCouponsEnabled
    ? _.take(cursor.get('coupons'), couponTryCount)
    : cursor.get('coupons');
  await rooMessenger({
    action: 'init',
    ignoreCancelled,
    coupons,
    script,
    store: {
      droppedCookie,
      cashback,
      clickId,
      couponRunId,
      isSiteHub
    }
  });
  const next = await rooMessenger({action: 'next'});
  if (!next) {
    return;
  }

  if (script.initialAction) {
    runAction(script.initialAction);
    if (script.initialActionDelay) {
      await delay(script.initialActionDelay);
    }
  } else if (
    script.disableInitialPromoRemove !== true &&
    script.promoRemoveAction &&
    getElement(script.promoRemoveAction) // only runs in the case that promoRemoveAction is a selector
  ) {
    runAction(script.promoRemoveAction);
    if (script.postRemoveDelay) {
      await delay(script.postRemoveDelay);
    }
  }

  const result = await rooRunner(next, {onTryCode});
  if (result) {
    result.isSiteHub = isSiteHub;
    result.couponRunId = couponRunId;
    result.cashback = cashback;
    result.couponScriptType = 'roo';
    if (script.useCodeEntered && !result.bestCoupon) {
      result.requiresInput = script.codeEnteredAction
        ? Boolean(getElement(script.codeEnteredAction))
        : true;
    }
    result.duration = new Date().getTime() - couponStartTime;
    await handleResult({result, droppedCookie, clickId});
  }
  tryingCodes = false;
}

export function initCoupons(options) {
  return new Promise(async (resolve, reject) => {
    const domain = currentDomain();
    const siteAPIData = await siteCache(domain);
    const siteData = {
      domain,
      pageTypes: _.get(siteAPIData, 'siteData.pageTypes'),
      coupons: _.get(siteAPIData, 'siteData.coupons')
    };

    const {script, coupons, ignoreAffiliate} = siteData.coupons;

    if (
      ignoreAffiliate ||
      tree.get(['couponsAffiliateDisabledSites', `${domain}_${tree.get('tabId')}`]) >
        moment().unix() ||
      tree.get(['couponsAffiliateDisabledSites', `${domain}_all`]) > moment().unix()
    ) {
      cursor.set('disableAffiliate', true);
    }

    const isPage = await isCouponPage(siteData.coupons.script);
    if (!isPage) {
      return;
    }

    let standDown;
    if (
      tree.get(['couponsDisabledSites', `${domain}_${tree.get('tabId')}`]) > moment().unix() ||
      tree.get(['couponsDisabledSites', `${domain}_all`]) > moment().unix()
    ) {
      standDown = true;
    }

    const config = {
      coupons,
      standDown,
      roo: true,
      estimatedRunTime: 25000,
      runTimePerCoupon:
        (script.getTotalDelay || 0) + (script.preApplyDelay || 0) + (script.postRemoveDelay || 0),
      couponCount: coupons.length,
      disableAffiliate: ignoreAffiliate || hasFeature('ext_tigger_af_off'),
      affiliateLinkCurrentTab: _.get(siteAPIData, 'meta.affiliate_link_current_tab')
    };

    if (hasFeature('user_contributed_codes')) {
      setupCouponListener(script);
    }

    await rooMessenger({action: 'pageLoad'});
    const nextAction = await rooMessenger({action: 'next'});

    if (nextAction) {
      tryingCodes = true;
      // Roo is running
      if (nextAction.action === 'cancelled') {
        return;
      } else {
        const currentCouponCode = await rooMessenger({action: 'nextCode'});
        _.assign(config, {
          disableDelay: !!currentCouponCode,
          rooRunning: true,
          currentCouponCode
        });
        tree.set('couponsConfig', config);
        resolve(config);
        const result = await rooRunner(nextAction, {onTryCode});
        if (result) {
          if (script.useCodeEntered && !result.bestCoupon) {
            result.requiresInput = script.codeEnteredAction
              ? Boolean(getElement(script.codeEnteredAction))
              : true;
          }
          const {droppedCookie, clickId, couponRunId, isSiteHub, cashback} = result.store;
          result.isSiteHub = isSiteHub;
          result.couponRunId = couponRunId;
          result.cashback = cashback;
          result.duration = result.runTime;
          await handleResult({result, droppedCookie, clickId});
        }
        cursor.set('rooRunning', false);
      }
    } else {
      // Roo is not running
      sendMetric('track', 'couponCheck', {
        domain,
        pagePath: location.pathname
      });
      tree.set('couponsConfig', config);
      resolve(config);
    }
  });
}

async function rooRunner(message, cbs) {
  const {onTryCode = null} = cbs;
  tryingCodes = true;
  try {
    if (message.action === 'tryCode') {
      if (onTryCode && !message.applyingBestCode) {
        onTryCode(message.code);
      }
      const coupon = await applyCode(message.script, message.code);
      await rooMessenger({action: 'saveCoupon', coupon});
    } else if (message.action === 'getTotal') {
      const total = await getTotal(message.script);
      await rooMessenger({action: 'saveTotal', total});
    } else if (message.action === 'removePrevious') {
      const removed = await removePrevious(message.script, message.lastCodeHadSavings);
      await rooMessenger({action: 'codeRemoved', removed});
    } else if (message.action === 'finish') {
      tryingCodes = false;
      return message.result;
    } else if (message.action === 'error') {
      tryingCodes = false;
      throw new Error(message.error.message);
    } else if (message.action === 'cancelled') {
      tryingCodes = false;
      return;
    } else if (message.action === 'wait') {
      await delay(10000);
      // Assume that if the page hasn't reloaded in 10 seconds, we missed something and should continue running
      await rooMessenger({action: 'pageLoad'});
    }
    const next = await rooMessenger({action: 'next'});
    if (!next) {
      return;
    }
    return await rooRunner(next, cbs);
  } catch (e) {
    const stack = e.stack.split('\n');
    const message = (stack[0] + stack[1]).match(/(.*)\s\(/)[1];
    sendMetric('track', 'rooError', {
      message,
      domain: currentDomain(),
      url: document.URL
    });
    return await rooMessenger({action: 'error'});
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
              if (_.get(code, 'length')) {
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
