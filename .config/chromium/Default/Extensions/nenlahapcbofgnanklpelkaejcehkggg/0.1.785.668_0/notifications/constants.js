let constants = {};

if (__ENV__ === 'local') {
  constants = {
    WIKIBUY_API: 'http://api.ivf-local.com:3000/v1',
    WIKIBUY_URL: 'http://ivf-local.com:3000',
    SITE_API: 'https://site.ivf-dev.com/v1',
    SITE_API_V3: 'https://site.ivf-dev.com/v3',
    ASYNC_TIGGER_IFRAME_URL: 'https://localhost:3003/iframe.html',
    ENV: __ENV__
  };
} else if (__ENV__ === 'dev') {
  constants = {
    WIKIBUY_API: 'https://api.ivf-dev.com/v1',
    WIKIBUY_URL: 'https://ivf-dev.com',
    SITE_API: 'https://site.ivf-dev.com/v1',
    SITE_API_V3: 'https://site.ivf-dev.com/v3',
    ASYNC_TIGGER_IFRAME_URL: 'https://api.ivf-dev.com/v1/coupon/iframe.html',
    ENV: __ENV__
  };
} else if (__ENV__ === 'stage') {
  constants = {
    WIKIBUY_API: 'https://api.ivf-stage.com/v1',
    WIKIBUY_URL: 'https://ivf-stage.com',
    SITE_API: 'https://site.ivf-stage.com/v1',
    SITE_API_V3: 'https://site.ivf-stage.com/v3',
    ASYNC_TIGGER_IFRAME_URL: 'https://api.ivf-stage.com/v1/coupon/iframe.html',
    ENV: __ENV__
  };
} else {
  constants = {
    WIKIBUY_API: 'https://wikibuy.com/api/v1',
    WIKIBUY_URL: 'https://wikibuy.com',
    SITE_API: 'https://site.ivaws.com/v1',
    SITE_API_V3: 'https://site.wikibuy.com/v3',
    ASYNC_TIGGER_IFRAME_URL: 'https://wikibuy.com/api/v1/coupon/iframe.html',
    ENV: __ENV__
  };
}

constants.REVIEW_URL =
  'https://chrome.google.com/webstore/detail/wikibuy/nenlahapcbofgnanklpelkaejcehkggg/reviews';

module.exports = constants;
