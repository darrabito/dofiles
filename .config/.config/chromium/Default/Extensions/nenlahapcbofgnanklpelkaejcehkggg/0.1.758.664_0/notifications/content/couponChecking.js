import _ from 'lodash';
import sendMetric from 'utility/sendMetric';
import hasFeature from 'utility/hasFeature';
import Promise from 'bluebird';
import moment from 'moment';
import $ from 'jquery';
import tree from 'state';
import compStateCache from 'messenger/outbound/compStateCache';
import hasActivatedHoney from 'messenger/outbound/hasActivatedHoney';
import getShopifyDomain from 'content/utility/shopify';
import parsePrice from 'content/utility/parsePrice';
import {initEbatesChecking, initEbatesCouponChecking} from './comps/ebates';
import waitForSelector from 'content/utility/waitForSelector';

let currentDomain;

function buttonsLoaded() {
  try {
    const selector = document
      .querySelector('#honeyContainer')
      .shadowRoot.querySelector('#honey')
      .querySelectorAll('button');
    return selector.length && selector;
  } catch (e) {
    return false;
  }
}

function popupLoaded() {
  return document.querySelector('#honeyContainer');
}

function findHoneyCashbackRate() {
  try {
    const el = document.querySelector('#honeyContainer').shadowRoot.querySelector('#honey-shadow');
    let value;
    if (el) {
      const rawValue =
        $(el)
          .find('[id*=HoneyGoldAmount]')
          .text() ||
        $(el)
          .find('[class*=DescriptiveGold] span[class*=textBold]')
          .text() ||
        $(el)
          .find('[class^=ctaColumn] [class^=container] [class^=title]')
          .text() ||
        $(el)
          .find('[class*=goldText] span:contains("Gold")')
          .text();

      value =
        rawValue && rawValue.match(/(\d+[,]?\d* to \d+[,]?\d*(?:%|\sHoney Gold|\sGold))/)
          ? rawValue.match(/(\d+[,]?\d* to \d+[,]?\d*(?:%|\sHoney Gold|\sGold))/)[1]
          : null;
    }
    return value;
  } catch (e) {
    return null;
  }
}

function findHoneyHeadline() {
  // TODO: fill out
  // const el = document.querySelector('#honeyContainer').shadowRoot.querySelector('#honey-shadow');
  // let value;
  // if (el) {
  //   const rawValue =
  //     $(el)
  //       .find('[id*=HoneyGoldAmount]')
  //       .text() ||
  //     $(el)
  //       .find('[class*=DescriptiveGold] span[class*=textBold]')
  //       .text() ||
  //     $(el)
  //       .find('[class^=ctaColumn] [class^=container] [class^=title]')
  //       .text() ||
  //     $(el)
  //       .find('[class*=goldText] span:contains("Gold")')
  //       .text();
  //   value = rawValue.match(/(\d+ to \d+).+Gold/) ? rawValue.match(/(\d+ to \d+(?:%|\sHoney Gold|\sGold))/)[1] : rawValue;
  // }
  // return value;
}

async function findHoneyCta() {
  const ctaButton = await new Promise((resolve, reject) => {
    waitForSelector(buttonsLoaded, buttons => {
      const hButton = _.last(buttons);
      resolve(hButton);
    });
  });
  return ctaButton;
}

function findHoneyCartTotal() {
  const el = document.querySelector('#honeyContainer').shadowRoot.querySelector('#honey-shadow');
  let value;
  if (el) {
    value = $(el)
      .find('[class*=bodyContentGreen] p:contains("Cart Total")')
      .text();
    value = parsePrice(value) / 100;
  }
  return value;
}

function findHoneyCashbackReactivation() {
  const el = document.querySelector('#honeyContainer').shadowRoot.querySelector('#honey-shadow');
  let value;
  if (el) {
    value = $(el)
      .find("div:contains('re-activate Honey')")
      .text();
  }
  return !!value;
}

function handleHoneyCompetitorNotif() {
  const tld = location.hostname.replace(/^www\./, '');
  const storageKey = `honeyWarningNotif-${tld}`;
  chrome.storage.local.get(storageKey, async data => {
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
      hasActivatedHoney({[tld]: true});
    }
  });
}

function addTryCouponsEvtListener() {
  waitForSelector(buttonsLoaded, buttons => {
    const hButton = _.last(buttons);
    const tryCouponsButtonFound = hasTryCouponsButton(buttons);
    const honeyGoldButtonFound = hasHoneyGoldButton(buttons);
    if (hButton) {
      const cartTotal = findHoneyCartTotal();
      // const headlineText = findHoneyHeadline();
      const ctaText = hButton.textContent;
      const cashbackRate = findHoneyCashbackRate();
      hButton.addEventListener('click', () => {
        if (tryCouponsButtonFound) {
          sendMetric('track', 'honeyTryCoupons', {
            domain: getDomain(),
            pagePath: location.pathname,
            url: location.href,
            cartTotal,
            ctaText,
            // headlineText: '',
            cashbackRate
          });
        }

        compStateCache({action: 'initSavingsCheck', comp: 'honey'});
        // Set state in bg in case page reloads
        checkUntilTimeout(summaryModalLoaded, 40000, 500, handleHoneySavings);
      });
    }
    if (tryCouponsButtonFound) {
      tryCouponsButtonFound.addEventListener('click', handleHoneyCompetitorNotif);
    }
    if (honeyGoldButtonFound) {
      honeyGoldButtonFound.addEventListener('click', handleHoneyCompetitorNotif);
    }
  });
}

async function initHoneyChecking() {
  try {
    const honeyIsRunning = await compStateCache({action: 'getHoneyState', comp: 'honey'});
    if (honeyIsRunning) {
      checkUntilTimeout(summaryModalLoaded, 40000, 500, handleHoneySavings);
    }

    const ctaButton = await findHoneyCta();
    const cartTotal = findHoneyCartTotal();
    const ctaText = ctaButton ? ctaButton.textContent : null;
    waitForSelector(popupLoaded, customEl => {
      tree.set(['compPopup'], {
        type: 'honey'
      });

      addTryCouponsEvtListener();
      const changeVisibility = _.debounce(visible => {
        sendMetric('track', visible ? 'showHoney' : 'hideHoney', {
          domain: getDomain(),
          pagePath: location.pathname,
          url: location.href,
          cartTotal,
          ctaText,
          // headlineText: '',
          cashbackRate: findHoneyCashbackRate(),
          reactivation: findHoneyCashbackReactivation()
        });
      }, 1000);
      const observer = new MutationObserver(mutations => {
        _.forEach(mutations, mutationRecord => {
          const visibility = _.get(mutationRecord, 'target.style.visibility');
          if (visibility === 'hidden') {
            changeVisibility(false);
          } else if (visibility === 'initial' || visibility === 'visible') {
            changeVisibility(true);
          }
        });
      });
      const target = customEl ? customEl.shadowRoot.querySelector('#honey-shadow') : null;
      if (target) {
        observer.observe(target, {attributes: true, attributeFilter: ['style']});
        const visibility = target.style.visibility;
        if (visibility === 'hidden') {
          changeVisibility(false);
        } else if (visibility === 'initial' || visibility === 'visible') {
          changeVisibility(true);
        }
      }
    });
  } catch (e) {}
}

async function checkUntilTimeout(check, timeout, interval, cb) {
  const timeoutID = setTimeout(cb, timeout);
  let result = check();
  while (!result) {
    await delay(interval);
    result = check();
  }
  clearTimeout(timeoutID);
  cb(result);
}

function delay(interval) {
  return new Promise(res => {
    setTimeout(res, interval);
  });
}

function handleHoneySavings(data) {
  if (!data) return;
  compStateCache({action: 'endSavingsCheck', comp: 'honey'});
  const savings =
    _.get(data, 'savings') && typeof _.get(data, 'savings') === 'number'
      ? +data.savings.toFixed(2)
      : null;
  const originPrice =
    _.get(data, 'originalPrice') && typeof _.get(data, 'originalPrice') === 'number'
      ? +data.originalPrice.toFixed(2)
      : null;
  const finalPrice =
    _.get(data, 'withHoneyPrice') && typeof _.get(data, 'withHoneyPrice') === 'number'
      ? +data.withHoneyPrice.toFixed(2)
      : null;
  const domain = getDomain();
  const storageKey = `honeyWarningNotif-${domain}`;

  sendMetric('track', 'honeyFindSavings', {
    domain,
    couponSavings: savings,
    rewardsSavings: _.get(data, 'rewards', null),
    originPrice,
    finalPrice,
    codeApplied: _.get(data, 'workingCode', null),
    pagePath: location.pathname,
    url: location.href
  });

  chrome.storage.local.get(storageKey, data => {
    const lastSeenWarning = _.get(data, storageKey);
    if (
      (moment
        .unix(lastSeenWarning)
        .add(1, 'days')
        .isBefore(moment()) ||
        !lastSeenWarning) &&
      hasFeature('credits_competitor_click_warning')
    ) {
      tree.set(['warnAboutStandDown'], true);
      hasActivatedHoney({[domain]: true});
    }
  });
}

export function getDomain() {
  if (currentDomain) {
    return currentDomain;
  }

  let domain = location.hostname.replace(/^www\./, '');
  domain = getShopifyDomain(domain) || domain;
  return domain;
}

function hasTryCouponsButton(buttons) {
  return (
    _.find(buttons, button => {
      return /coupon(?:s)?|code(?:s)?/i.test(button.innerHTML);
    }) ||
    _.find(
      document
        .querySelector('#honeyContainer')
        .shadowRoot.querySelector('#honey')
        .querySelectorAll('span'),
      span => span.innerHTML === 'Coupon codes'
    )
  );
}

function hasHoneyGoldButton(buttons) {
  return _.find(buttons, button => {
    return /claim honey gold|claim rewards/i.test(button.innerHTML);
  });
}

const summaryModalParsers = [
  // You saved
  () => {
    try {
      const honeyModal = document.querySelector('#honeyContainer').shadowRoot;
      const savedRe = /You saved/;
      const hasSavings = honeyModal.innerHTML.match(savedRe);

      if (hasSavings) {
        const rawSavings = _.get(honeyModal.querySelector('[class*=savingsPrice]'), 'textContent');
        const savings = rawSavings ? parsePrice(rawSavings) / 100 : null;
        const rawOriginalPrice = _.get(
          honeyModal.querySelector('[id*=OriginalPrice]'),
          'textContent'
        );
        const originalPrice = rawOriginalPrice ? parsePrice(rawOriginalPrice) / 100 : null;
        const rawWithHoneyPrice = _.get(
          honeyModal.querySelector('[id*=WithHoneyPrice]'),
          'textContent'
        );
        const withHoneyPrice = rawWithHoneyPrice ? parsePrice(rawWithHoneyPrice) / 100 : null;
        const rewards = _.get(honeyModal.querySelector('[id*=HoneyGoldAmount]'), 'textContent');
        const workingCode = _.get(honeyModal.querySelector('[class*=workingCode]'), 'textContent');

        return {foundModal: true, savings, rewards, originalPrice, withHoneyPrice, workingCode};
      }
    } catch (e) {
      return false;
    }
  },
  // Honey Gold activated
  () => {
    try {
      const honeyModal = document.querySelector('#honeyContainer').shadowRoot;
      const savedRe = /Honey Gold.+activated/i;
      const foundModal = honeyModal.innerHTML.match(savedRe);

      if (foundModal) {
        const rewards = _.get(
          honeyModal.querySelector('[class*=DescriptiveGold] span[class*=textBold]'),
          'textContent'
        );

        return {foundModal: true, rewards};
      }
    } catch (e) {
      return false;
    }
  },
  // free sample
  () => {
    try {
      const honeyModal = document.querySelector('#honeyContainer').shadowRoot;
      const savedRe = /forget your free sample/i;
      const hasSavings = honeyModal.innerHTML.match(savedRe);

      if (hasSavings) {
        const rawSavings = _.get(
          honeyModal.querySelector('[id*=FreeItemReceipt][id*=titleContent]'),
          'textContent'
        );
        const savings = rawSavings ? parsePrice(rawSavings) / 100 : null;
        const rewards = _.get(
          honeyModal.querySelector('[id*=honeyGoldContainer] [class*=bold]'),
          'textContent'
        );
        const codesArr = honeyModal.querySelectorAll(
          '[class*=couponsContainer] [class*=couponPointer] [class*=couponTitle]'
        );
        const workingCode = _.map(codesArr, el => el.textContent);

        return {foundModal: true, savings, rewards, workingCode};
      }
    } catch (e) {
      return false;
    }
  },
  // no savings, no reward
  () => {
    try {
      const honeyModal = document.querySelector('#honeyContainer').shadowRoot;
      const savedRe = /You already have the best price/i;
      const hasSavings = honeyModal.innerHTML.match(savedRe);

      if (hasSavings) {
        return {foundModal: true};
      }
    } catch (e) {
      return false;
    }
  },
  // Get.+Gold back
  () => {
    try {
      const honeyModal = document.querySelector('#honeyContainer').shadowRoot;
      const savedRe = /Get.+Gold back/;
      const hasSavings = honeyModal.innerHTML.match(savedRe);

      if (hasSavings) {
        const rewards = _.get(
          honeyModal.querySelector('[id*=bonusCashContentContainer] [id*=span-bonusCashContent]'),
          'textContent'
        );

        return {foundModal: true, rewards};
      }
    } catch (e) {
      return false;
    }
  },
  // % activated
  () => {
    try {
      const honeyModal = document.querySelector('#honeyContainer').shadowRoot;
      const savedRe = /\d+% back|activated/;
      const hasSavings = honeyModal.innerHTML.match(savedRe);
      honeyModal.querySelector('[id*=bonusCashContentContainer] [id*=span-bonusCashContent]')
        .textContent;
      if (hasSavings) {
        const rewards = _.get(
          honeyModal.querySelector('[id*=bonusCashContentContainer] [id*=span-bonusCashContent]'),
          'textContent'
        );

        return {foundModal: true, rewards};
      }
    } catch (e) {
      return false;
    }
  }
];

function summaryModalLoaded() {
  let result;
  _.forEach(summaryModalParsers, parser => {
    const found = parser();
    if (_.has(found, 'foundModal')) {
      result = found;
      return;
    }
  });
  return result;
}

export default domain => {
  currentDomain = domain;
  initHoneyChecking();
  initEbatesChecking();
  initEbatesCouponChecking();
};
