import {isWhitelisted, isTracklisted, isBlacklisted} from './libs/listCache';
import tldjs from 'tldjs';
import bluebird from 'bluebird';
import _ from 'lodash';
import {track} from 'utility/analytics';
import hasFeature from 'utility/hasFeature';
import tree from 'state';
import platformSelectors from 'messaging/notifications/outbound/platformSelectors';

let monitorsInitialized = false;

async function timeoutPromise(promise, ms) {
  const timeout = new bluebird((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(`Promise timed out in ${ms}ms.`);
    }, ms);
  });
  const result = await bluebird.race([promise, timeout]);
  return result;
}

async function getLists(domain) {
  const [whitelisted, tracklisted, blacklisted] = await bluebird.all([
    isWhitelisted(domain),
    isTracklisted(domain),
    isBlacklisted(domain)
  ]);
  return {whitelisted, tracklisted, blacklisted};
}

async function wooCommerceListener(details) {
  const tld = tldjs.getDomain(details.url);
  const {blacklisted, whitelisted} = await getLists(tld);
  const code =
    _.get(details, 'requestBody.formData.coupon_code[0]') ||
    _.get(details.url.match(/coupon\/\?couponcode=([^&]*)/), '1');
  if (!blacklisted && (details.method === 'POST' || details.method === 'GET') && code) {
    chrome.tabs.get(details.tabId, async res => {
      const tabTld = tldjs.getDomain(res.url);
      let selectorsPresent;
      if (whitelisted) {
        const selectors = [
          '#coupontext',
          '#xoo-wsc-coupon-code',
          '.woocommerce-Price-amount.amount'
        ];
        try {
          selectorsPresent = await timeoutPromise(
            platformSelectors(details.tabId, selectors),
            5000
          );
        } catch (e) {
          // do nothing
        }
      }
      const eventProperties = {
        platform: 'WooCommerce',
        selectors: selectorsPresent,
        tld,
        code,
        tabUrl: res.url,
        tabTld,
        applyUrl: details.url
      };
      track('platformCouponApply', eventProperties);
    });
  }
}

async function magentoListener(details) {
  const tld = tldjs.getDomain(details.url);
  const {blacklisted} = await getLists(tld);
  const code =
    _.get(details, 'requestBody.formData.coupon_code[0]') ||
    _.get(details, 'requestBody.formData.code[0]');
  if (!blacklisted && details.method === 'POST' && code) {
    chrome.tabs.get(details.tabId, res => {
      const tabTld = tldjs.getDomain(res.url);
      const eventProperties = {
        platform: 'Magento',
        tld,
        code,
        tabUrl: res.url,
        tabTld,
        applyUrl: details.url
      };
      track('platformCouponApply', eventProperties);
    });
  }
}

async function bigCommerceListener(details) {
  const tld = tldjs.getDomain(details.url);
  const {blacklisted} = await getLists(tld);
  const code = _.get(details, 'requestBody.formData.code[0]');
  if (!blacklisted && details.method === 'POST' && code) {
    chrome.tabs.get(details.tabId, res => {
      const tabTld = tldjs.getDomain(res.url);
      const eventProperties = {
        platform: 'BigCommerce',
        tld,
        code,
        tabUrl: res.url,
        tabTld,
        applyUrl: details.url
      };
      track('platformCouponApply', eventProperties);
    });
  }
}

async function openCartListener(details) {
  const tld = tldjs.getDomain(details.url);
  const {blacklisted} = await getLists(tld);
  const code = _.get(details, 'requestBody.formData.coupon[0]');
  if (!blacklisted && details.method === 'POST' && code) {
    chrome.tabs.get(details.tabId, res => {
      const tabTld = tldjs.getDomain(res.url);
      const eventProperties = {
        platform: 'OpenCart',
        tld,
        code,
        tabUrl: res.url,
        tabTld,
        applyUrl: details.url
      };
      track('platformCouponApply', eventProperties);
    });
  }
}

async function shopifyListener(details) {
  const tld = tldjs.getDomain(details.url);
  const {blacklisted} = await getLists(tld);
  const code = _.get(details, 'requestBody.formData["checkout[reduction_code]"][0]');
  if (!blacklisted && details.method === 'POST' && code) {
    chrome.tabs.get(details.tabId, res => {
      const tabTld = tldjs.getDomain(res.url);
      const eventProperties = {
        platform: 'Shopify',
        tld,
        code,
        tabUrl: res.url,
        tabTld,
        applyUrl: details.url
      };
      track('platformCouponApply', eventProperties);
    });
  }
}

async function setUpPlatformMonitors() {
  const shouldSetUpMonitors = hasFeature('platform_monitor');
  if (shouldSetUpMonitors) {
    /* --------------- Magento --------------- */
    const throttledMagentoListener = _.throttle(magentoListener, 5000, {
      leading: true,
      trailing: false
    });
    chrome.webRequest.onBeforeRequest.addListener(
      async details => {
        throttledMagentoListener(details);
      },
      {
        urls: ['*://*/*/cart/couponPost*', '*://*/onestepcheckout/ajax/add_coupon*'],
        types: ['xmlhttprequest', 'main_frame']
      },
      ['requestBody']
    );

    /* --------------- WooCommerce --------------- */
    const throttledWooCommerceListener = _.throttle(wooCommerceListener, 5000, {
      leading: true,
      trailing: false
    });
    chrome.webRequest.onBeforeRequest.addListener(
      async details => {
        throttledWooCommerceListener(details);
      },
      {
        urls: ['*://*/*wc-ajax=apply_coupon*', '*://*/coupon/?couponcode=*', '*://*/*?promo='],
        types: ['xmlhttprequest', 'main_frame']
      },
      ['requestBody']
    );

    /* --------------- BigCommerce --------------- */
    const throttledBigCommerceListener = _.throttle(bigCommerceListener, 5000, {
      leading: true,
      trailing: false
    });
    chrome.webRequest.onBeforeRequest.addListener(
      async details => {
        throttledBigCommerceListener(details);
      },
      {urls: ['*://*/remote/v*/apply-code*'], types: ['xmlhttprequest', 'main_frame']},
      ['requestBody']
    );

    /* --------------- OpenCart --------------- */
    const throttledOpenCartListener = _.throttle(openCartListener, 5000, {
      leading: true,
      trailing: false
    });
    chrome.webRequest.onBeforeRequest.addListener(
      async details => {
        throttledOpenCartListener(details);
      },
      {
        urls: [
          '*://*/index.php?route=*coupon*',
          '*://*/index.php?route=*validateCoupon*',
          '*://*/index.php?route=checkout*'
        ],
        types: ['xmlhttprequest', 'main_frame']
      },
      ['requestBody']
    );

    /* --------------- Shopify --------------- */
    const throttledShopifyListener = _.throttle(shopifyListener, 5000, {
      leading: true,
      trailing: false
    });
    chrome.webRequest.onBeforeRequest.addListener(
      async details => {
        throttledShopifyListener(details);
      },
      {
        urls: ['*://*/*/checkouts/*'],
        types: ['xmlhttprequest', 'main_frame']
      },
      ['requestBody']
    );
  }
}

const featuresCursor = tree.select(['session', 'features']);

if (_.get(featuresCursor.get(), 'length')) {
  setUpPlatformMonitors();
} else {
  featuresCursor.on('update', function(e) {
    const features = e.data.currentData;
    if (!monitorsInitialized && _.get(features, 'length')) {
      monitorsInitialized = true;
      setUpPlatformMonitors();
    }
  });
}
