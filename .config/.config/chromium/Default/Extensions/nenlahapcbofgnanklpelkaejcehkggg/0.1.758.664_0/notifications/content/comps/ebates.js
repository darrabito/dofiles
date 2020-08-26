import {getDomain} from 'content/couponChecking'; // not ideal
import waitForSelector from 'content/utility/waitForSelector';
import compStateCache from 'messenger/outbound/compStateCache';
import sendMetric from 'utility/sendMetric';
import tree from 'state';
import moment from 'moment';
import hasActivatedEbates from 'messenger/outbound/hasActivatedEbates';
import _ from 'lodash';
import hasFeature from 'utility/hasFeature';
import $ from 'jquery';

export async function initEbatesChecking() {
  const honeyIsRunning = await compStateCache({action: 'getHoneyState', comp: 'honey'});
  const piggyIsRunning = await compStateCache({action: 'getCompState', comp: 'piggy'});
  if (!honeyIsRunning && !piggyIsRunning) {
    waitForSelector(checkEbatesLoaded, ebates => {
      sendMetric('track', 'ebatesNotif', {
        domain: getDomain(),
        pagePath: location.pathname,
        url: location.href,
        cashbackRate: findEbatesCashbackRate()
      });
      tree.set(['compPopup'], {
        type: 'ebates'
      });
      const activateButton = findEbatesActivateButton(ebates);
      if (activateButton) {
        activateButton.addEventListener('click', () => {
          const tld = location.hostname.replace(/^www\./, '');
          const storageKey = `ebatesWarningNotif-${tld}`;
          chrome.storage.local.get(storageKey, data => {
            const lastSeenWarning = _.get(data, storageKey);
            if (
              tree.get(['cashback', 'user', 'activated']) &&
              (moment
                .unix(lastSeenWarning)
                .add(1, 'days')
                .isBefore(moment()) ||
                !lastSeenWarning) &&
              hasFeature('credits_competitor_click_warning')
            ) {
              hasActivatedEbates({[tld]: true});
            }
            sendMetric('track', 'ebatesActivate', {
              domain: getDomain(),
              pagePath: location.pathname,
              url: location.href,
              cashbackRate: findEbatesCashbackRate()
            });
          });
        });
      }
      const closeButton = ebates.querySelector('.rr-button-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          sendMetric('track', 'ebatesDismiss', {
            domain: getDomain(),
            pagePath: location.pathname,
            url: location.href,
            cashbackRate: findEbatesCashbackRate()
          });
        });
      }
    });
  }
}

export async function initEbatesCouponChecking() {
  const honeyIsRunning = await compStateCache({action: 'getHoneyState', comp: 'honey'});
  if (!honeyIsRunning) {
    waitForSelector(checkEbatesCouponLoaded, ebates => {
      sendMetric('track', 'ebatesCouponNotif', {
        domain: getDomain(),
        pagePath: location.pathname,
        url: location.href
      });

      const tryButton = [...ebates.querySelectorAll('.r-button')].find(el =>
        el.textContent.includes('Apply Coupons')
      );
      if (tryButton) {
        tryButton.addEventListener('click', () => {
          sendMetric('track', 'ebatesTryCoupons', {
            domain: getDomain(),
            pagePath: location.pathname,
            url: location.href
          });
        });
      }

      const closeButton = ebates.querySelector('.rr-button-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          sendMetric('track', 'ebatesCouponDismiss', {
            domain: getDomain(),
            pagePath: location.pathname,
            url: location.href
          });
        });
      }
    });
  }
}

function checkEbatesLoaded() {
  try {
    return getEbatesShadowParent().shadowRoot.querySelector('.ebates-notification');
  } catch (e) {
    return false;
  }
}

function checkEbatesCouponLoaded() {
  try {
    const shadowRoot = getEbatesShadowParent().shadowRoot;
    const couponButton = [...shadowRoot.querySelectorAll('.r-button')].find(el =>
      el.textContent.includes('Apply Coupons')
    );
    return couponButton ? shadowRoot.querySelector('.rr-caa__flag') : false;
  } catch (e) {
    return false;
  }
}

function findEbatesActivateButton(parentEl) {
  const primaryButton = parentEl.querySelector('.rr-button-primary');
  return primaryButton && /activate/i.test(primaryButton.innerText)
    ? primaryButton
    : parentEl.querySelector('.ebates-notification-button.ebates-notification-button-activate') ||
        parentEl.querySelector('ebates-notification-button.ebates-notification-button-login');
}

function findEbatesCashbackRate() {
  try {
    const el =
      getEbatesShadowParent().shadowRoot.querySelector(
        '.ebates-notification .ebates-notification-button-activate'
      ) || getEbatesShadowParent().shadowRoot.querySelector('.rr-button-primary');
    const value = $(el).text();
    return value;
  } catch (e) {
    return false;
  }
}

function getEbatesShadowParent() {
  return [...document.querySelectorAll('html > *')].find(e => {
    // coupons, cashback
    if (e.shadowRoot && e.shadowRoot.querySelector('.rr-caa__flag, .ebates-notification')) {
      return true;
    }
  });
}
