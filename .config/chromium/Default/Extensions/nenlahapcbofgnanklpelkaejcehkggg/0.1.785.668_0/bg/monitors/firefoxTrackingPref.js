/* global browser */

import _ from 'lodash';
import getExtensionType from 'utility/getExtensionType';

let oldTrack;
let oldPage;
let oldIdentify;

if (getExtensionType() === 'firefox') {
  addFirefoxInstallListener(); // keep this sync & first so we catch the initial install event
  addFirefoxTrackingChangeListener();
  startupTrackingPrefCheck();
}

async function getTrackingValue() {
  const storageResult = await browser.storage.local.get('trackingEnabled');
  const currentTrackingValue = storageResult.trackingEnabled;
  return currentTrackingValue;
}

async function addFirefoxInstallListener() {
  browser.runtime.onInstalled.addListener(async details => {
    const reason = _.get(details, 'reason'); // always defined. one of "install", "update", "browser_update", "shared_module_update"
    if (reason && reason !== 'install') {
      // e.g. "update"
      const currentTrackingValue = await getTrackingValue();
      if (currentTrackingValue !== true && currentTrackingValue !== false) {
        await browser.storage.local.set({trackingEnabled: true}); // this implicitly updates storage because of the onChange
      }
    }
  });
}

async function startupTrackingPrefCheck() {
  const currentTrackingValue = await getTrackingValue();
  if (currentTrackingValue !== true) {
    disableAnalytics('startupTrackingPrefCheck');
  }
}

async function addFirefoxTrackingChangeListener() {
  browser.storage.onChanged.addListener((changes, areaName) => {
    const newValue = _.get(changes, 'trackingEnabled.newValue');
    if (newValue === true) {
      enableAnalytics('addFirefoxTrackingChangeListener');
    } else if (newValue === false) {
      disableAnalytics('addFirefoxTrackingChangeListener');
    }
  });
}

function enableAnalytics(caller) {
  if (getExtensionType() === 'firefox') {
    window.analytics.track = oldTrack;
    window.analytics.page = oldPage;
    window.analytics.identify = oldIdentify;
  }
}

function disableAnalytics(caller) {
  if (!oldTrack || !oldPage || !oldIdentify) {
    oldTrack = window.analytics.track;
    oldPage = window.analytics.page;
    oldIdentify = window.analytics.identify;
  }
  if (getExtensionType() === 'firefox') {
    window.analytics.track = _.noop;
    window.analytics.page = _.noop;
    window.analytics.identify = _.noop;
  }
}
