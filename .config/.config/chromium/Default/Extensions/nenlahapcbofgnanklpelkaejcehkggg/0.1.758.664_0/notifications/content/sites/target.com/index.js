import _ from 'lodash';
import tree from 'state';
import loadEstimateAnnotation from '../../utility/loadEstimateAnnotation';
import uuid from 'node-uuid';
import delay from '../../utility/delay';
import hasFeature from 'utility/hasFeature';

function isLoaded() {
  return !!document.getElementById('specAndDescript');
}

function getTextFromSelectors(selectors) {
  let text = '';
  _.forEach(selectors, s => {
    const textEls = document.querySelectorAll(s);
    for (let i = 0; i < textEls.length; i++) {
      const textEl = textEls[i];
      if (textEl && textEl.innerText) {
        text += `${textEl.innerText}\n`;
      }
    }
  });
  return text;
}

function getOGProperty(property) {
  const selector = `[property="og:${property}"]`;
  const el = document.querySelector(selector);
  if (el) {
    return el.content;
  }
  return null;
}

function getSelectedIdentifiers() {
  let pageTcin;
  const pageTcinMatches = getTextFromSelectors(['#specAndDescript']).match(/TCIN.*:\s*(.*)\n/);
  if (pageTcinMatches && pageTcinMatches.length) {
    pageTcin = pageTcinMatches[1].replace(/TCIN.*:\s*/, '');
  }

  const data = _(document.querySelectorAll('div[id="root"] + script'))
    .map(el => {
      if (el && el.innerText && _.includes(el.innerText, '__PRELOADED_STATE__')) {
        return JSON.parse(
          el.innerText
            .match(/\{.*\}/)[0]
            .replace('new Set([])', '"new Set([])"')
          );
      }
    })
    .get('[0]'); // THIS IS OUTDATED WHEN NAVIGATING WITHIN PAGES. THIS IS HOW IT WAS.

  const sku = _.get(data, 'product.selectedTcin');
  const parentSku = _.get(data, 'product.productDetails.item.parentTcin');
  const productTitle = document.querySelector('meta[property="og:title"]')
    ? document.querySelector('meta[property="og:title"]').getAttribute('content')
    : '';

  let skuInUrl =
    _.get(window.location.href.match(/preselect=\d+/), '[0]') ||
    _.get(window.location.href.match(/\/A-\d+/), '[0]');
  skuInUrl = skuInUrl
    .replace('preselect=', '')
    .replace('#', '')
    .replace('/A-', '');

  return {selectedSku: sku, parentSku, productTitle, skuInUrl, pageTcin};
}

async function getProductInfo() {
  try {
    const title = getOGProperty('title');
    const ogImage = getOGProperty('image');
    const image = ogImage
      ? ogImage.indexOf('//') === 0
        ? `https:${ogImage}`
        : ogImage
      : undefined;
    const schemaData = _(document.querySelectorAll('[type="application/ld+json"]'))
      .map(el => JSON.parse(el.innerText))
      .value();

    const {pageTcin, selectedSku, parentSku, productTitle, skuInUrl} = getSelectedIdentifiers();

    let productData;
    const schemaSku = _.get(schemaData, '[0].@graph[0].sku');
    const schemaTitle = _.get(schemaData, '[0].@graph[0].name');
    // getting sku is unreliable - looking for alternative ways to get it - last resort use title.
    // Single page app issues :/
    if (schemaSku === selectedSku || schemaSku === parentSku || skuInUrl === schemaSku || schemaTitle === productTitle) {
      productData = _.get(schemaData, '[0].@graph[0]');
    } else {
      // Looks like target updated their META. Not sure if its on every product. Also adding in looking for parent sku as well 7/1/19
      productData = _.chain(schemaData)
        .get('[0]@graph[0].@graph')
        .filter(d => d['@type'] === 'Product')
        .find({sku: selectedSku})
        .value();
      productData =
        productData ||
        _.chain(schemaData)
          .get('[0]@graph[0].@graph')
          .filter(d => d['@type'] === 'Product')
          .find({sku: parentSku})
          .value();
    }

    if (!productData && schemaSku) {
      // LAST RESORT FALLBACK
      productData = _.get(schemaData, '[0].@graph[0]');
    }
    if (!productData) {
      return;
    }

    const price = (
      getTextFromSelectors(['.h-padding-t-tight [data-test="product-price"]']) ||
      _.get(productData, 'offers.price')
    ).trim();
    const sku = pageTcin || productData.sku;

    let gtin;
    const gtinMatches = getTextFromSelectors(['#specAndDescript']).match(/UPC:\s*(\d+)/);
    if (gtinMatches && gtinMatches.length) {
      gtin = gtinMatches[1];
      while (gtin.length < 14) {
        gtin = `0${gtin}`;
      }
    }
    const brand = _.get(schemaData, '[0].@graph[0].brand');

    let mpn;
    const mpnMatches = getTextFromSelectors(['#specAndDescript']).match(/Item Number.*:\s*(.*)\n/);
    if (mpnMatches && mpnMatches.length) {
      mpn = mpnMatches[1].replace(/Item Number.*:\s*/, '');
    }

    return {
      title,
      image,
      price,
      sku,
      gtin,
      brand,
      mpn,
      url: window.location.href,
      vendor: 'target.com',
      wbpid: `target.com_${sku}`
    };
  } catch (e) {
    return null;
  }
}

async function run() {
  // Get product info
  const product = await getProductInfo();
  if (_.get(product, 'gtin')) {
    loadEstimateAnnotation(
      {
        additionalClass: 'target-product-page',
        insertAfterElement: document.querySelector('[data-test="ratingFeedbackContainer"]')
      },
      {
        waitForFullRun: true,
        offersFrom: true,
        originVendor: 'target.com',
        input: {
          product,
          unpricedResults: [
            {
              vendor: 'target.com',
              product,
              atc: {
                method: 'POST',
                url:
                  'https://checkout-api-secure.target.com/order-api/cart/v5/cartitems?responseGroup=cart',
                httpVersion: 'HTTP/1.1',
                headers: [
                  {
                    name: 'Origin',
                    value: 'http://www.target.com'
                  },
                  {
                    name: 'Accept-Encoding',
                    value: 'gzip, deflate, br'
                  },
                  {
                    name: 'Host',
                    value: 'checkout-api-secure.target.com'
                  },
                  {
                    name: 'Accept-Language',
                    value: 'en-US,en;q=0.8'
                  },
                  {
                    name: 'User-Agent',
                    value:
                      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
                  },
                  {
                    name: 'Content-Type',
                    value: 'application/json'
                  },
                  {
                    name: 'Accept',
                    value: '*/*'
                  },
                  {
                    name: 'Referer',
                    value: product.url
                  },
                  {
                    name: 'Cookie',
                    value: ''
                  },
                  {
                    name: 'Connection',
                    value: 'keep-alive'
                  },
                  {
                    name: 'Pragma',
                    value: 'no-cache'
                  },
                  {
                    name: 'Cache-Control',
                    value: 'no-cache'
                  }
                ],
                postData: {
                  mimeType: 'application/json',
                  text: `{"products":[{"partnumber":"${product.sku}","quantity":"1","age":"17"}]}`
                }
              },
              details: {},
              meta: {
                graphLink: true
              },
              id: uuid.v4()
            }
          ]
        }
      }
    );
  }
}

function handleChange(mutations) {
  if (window.location.href.match(/\/p\//i)) {
    tree.set('trigger', 'productPage');
    setTimeout(run, 500);
  }
}
export default async function getSite() {
  if (!hasFeature('ext_other_origins') || !hasFeature('ext_other_origins_target')) {
    return;
  }
  while (!isLoaded()) {
    await delay(25);
  }
  let active = false;
  const targets = [
    document.querySelector('#specAndDescript'),
    document.querySelector('title')
  ];
  const debouncedHandleChange = _.debounce(handleChange, 1000);
  debouncedHandleChange();
  const observer = new MutationObserver(debouncedHandleChange);
  _.forEach(targets, target => {
    observer.observe(target, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
      attributeOldValue: true,
      characterDataOldValue: true
    });
  });
  return {active};
}