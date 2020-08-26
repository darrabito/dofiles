/* global browser */

export default async (data, tab) => {
  const {message} = data;
  if (message === 'enableTracking') {
    await browser.storage.local.set({trackingEnabled: true});
  } else if (message === 'disableTracking') {
    await browser.storage.local.set({trackingEnabled: false});
  } else if (message === 'openOptionsPage') {
    browser.runtime.openOptionsPage();
  }
};
