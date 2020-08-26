import _ from 'lodash';
import tldjs from 'tldjs';
import tree from 'state';
import LRU from 'lru-cache';

const requestCache = LRU({
  max: 20,
  maxAge: 1000 * 60 * 5 // 5 min
});


const extraHeaders = chrome.webRequest.OnBeforeSendHeadersOptions.hasOwnProperty('EXTRA_HEADERS')
  ? 'extraHeaders'
  : undefined;
chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    const needsCookie = _.find(details.requestHeaders, h => h.name === 'x-wb-cookie');
    if (needsCookie && details.url.indexOf('v1/redirect') === -1) {
      details.requestHeaders.push({
        name: 'Cookie',
        value: `wb_session=${tree.get('sessionToken')}`
      });
    }

    return {requestHeaders: details.requestHeaders};
  },
  {urls: [
    '*://*.wikibuy.com/*',
    '*://*.ivf-stage.com/*',
    '*://*.ivf-dev.com/*'
  ], types: ['xmlhttprequest']},
  _.compact(['blocking', 'requestHeaders', extraHeaders])
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    const domain = tldjs.getDomain(details.url);
    if (domain && domain.match(/wikibuy\.com|ivf-dev\.com|ivf-stage\.com|ivaws\.com/)) {
      requestCache.set(details.requestId, true);
      details.requestHeaders.push({
        name: 'x-wb-extension',
        value: 'true'
      });
      const token = tree.get(['lastAccountSession', 'sessionToken']);
      if (token) {
        details.requestHeaders.push({
          name: 'x-wb-session',
          value: decodeURIComponent(token)
        });
      }
    }
    return {requestHeaders: details.requestHeaders};
  },
  {
    urls: [
      '*://*.wikibuy.com/*',
      '*://*.ivf-stage.com/*',
      '*://*.ivf-dev.com/*',
      '*://*.ivaws.com/*'
    ],
    types: ['xmlhttprequest', 'main_frame']
  },
  ['blocking', 'requestHeaders']
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    // If the request was originally sent to a wikibuy domain
    // remove extra headers because it is being redirected
    if (requestCache.has(details.requestId)) {
      details.requestHeaders = _.reduce(details.requestHeaders, (accum, header, headers) => {
        if (header.name !== 'x-wb-session' && header.name !== 'x-wb-extension') {
          accum.push(header);
        }
        return accum;
      }, [])
    }
    return {requestHeaders: details.requestHeaders};
  },
  {
    urls: [
      '<all_urls>'
    ],
    types: ['xmlhttprequest', 'main_frame']
  },
  ['blocking', 'requestHeaders']
);