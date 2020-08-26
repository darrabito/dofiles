import tree from 'state';

let monitorInitialized = false;

async function airbnbMonitor(details) {
  try {
    if (details.url && details.url.indexOf('PdpPlatformSections') > -1) {
      tree.set(['airbnbDetailsUrl'], details.url);
      tree.set(['airbnbDetailsHeaders'], details.requestHeaders);
    }
  } catch (e) {}
}

async function setupMonitor() {
  if (!monitorInitialized) {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      async details => {
        airbnbMonitor(details);
      },
      {
        urls: ['*://www.airbnb.com/api/v2/pdp_listing_details/*', '*://www.airbnb.com/api/v3?locale*PdpPlatformSections*', '*://www.airbnb.com/api/v3/PdpPlatformSections*'],
        types: ['xmlhttprequest']
      },
      ['requestHeaders', 'blocking', 'extraHeaders']
    );
    monitorInitialized = true;
  }
}

setupMonitor();
