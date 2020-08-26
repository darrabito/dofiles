import _ from 'lodash';
import tree from 'state';
import getPriceFromSelector from '../../utility/getPriceFromSelector';
import loadEstimateAnnotation from '../../utility/loadEstimateAnnotation';
import uuid from 'node-uuid';
import hasFeature from 'utility/hasFeature';

async function getProductInfo() {
  try {
    let ldContent;
    const ldContentBlobs = document.querySelectorAll('[type="application/ld+json"]');
    _.forEach(ldContentBlobs, blob => {
      const innerText = _.get(blob, 'innerText');
      if (innerText && _.includes(innerText, 'gtin')) {
        ldContent = JSON.parse(innerText);
      }
    });

    const brand = document.querySelector('.sticky_brand_info');
    const sku = _.get(ldContent, 'productID') || _.get(document.querySelector('[itemprop="productID"]'), 'innerText') || null;

    return {
      title: _.get(ldContent, 'name') || document.querySelector('[itemprop="name"]').getAttribute('content'),
      image: _.get(document.querySelector('[itemprop="image"]'), 'src') || _.get(ldContent, 'image[0]'),
      price: _.get(ldContent, 'offers.price') || (document.querySelector('#ajaxPrice') ? document.querySelector('#ajaxPrice').getAttribute('content') : document.querySelector('#ajaxPriceAlt') ? document.querySelector('#ajaxPriceAlt').getAttribute('content') : ''),
      brand: _.get(ldContent, 'brand.name') || _.get(brand, 'innerText', ''),
      gtin: _.get(ldContent, 'gtin13') || document.querySelector('[itemprop="gtin13"]').getAttribute('content'),
      sku,
      url: window.location.href,
      wbpid: `homedepot.com_${sku}`,
      vendor: 'homedepot.com'
    };
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function run() {
  // Get product info  
  const product = await getProductInfo();
  if (_.get(product, 'gtin')) {
    console.log('32io4u23o4237834872398497832')
    loadEstimateAnnotation(
      {
        additionalClass: 'homedepot-product-page',
        insertAfterElement: document.querySelector('.og-offer') || document.querySelector('.productmarquee__media ~ div .grid:nth-child(4)') || document.querySelector('.product-details__review')
      },
      {
        waitForFullRun: true,
        originVendor: 'homedepot.com',
        offersFrom: true,
        input: {
          product,
          unpricedResults: [
            {
              vendor: 'homedepot.com',
              product,
              atc: {
                method: 'POST',
                url: 'https://secure2.homedepot.com/mcc-cart/v2/Cart',
                headers: [
                  {
                    name: 'Origin',
                    value: 'https://www.homedepot.com'
                  },
                  {
                    name: 'Accept-Encoding',
                    value: 'gzip, deflate, br'
                  },
                  {
                    name: 'Host',
                    value: 'secure2.homedepot.com'
                  },
                  {
                    name: 'Accept-Language',
                    value: 'en-US,en;q=0.9'
                  },
                  {
                    name: 'User-Agent',
                    value:
                      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
                  },
                  {
                    name: 'content-type',
                    value: 'application/json'
                  },
                  {
                    name: 'accept',
                    value: 'application/json;charset=utf-8'
                  },
                  {
                    name: 'Referer',
                    value: 'https://www.homedepot.com/'
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
                    name: 'Content-Length',
                    value: '156'
                  }
                ],
                postData: {
                  mimeType: 'application/json',
                  text:
                    '{"CartRequest":{"itemDetails":[{"itemId":"301766885","quantity":"1","fulfillmentLocation":"78704","fulfillmentMethod":"ShipToHome"}],"localStoreId":"6542"}}'
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

export default function getSite() {
  if (!hasFeature('ext_other_origins') || !hasFeature('ext_other_origins_home_depot')) {
    return;
  }
  let active = false;
  if (window.location.href.match(/\/p\//i)) {
    tree.set('trigger', 'productPage');
    window.addEventListener('DOMContentLoaded', () => run());
    active = true;
  }
  return {active};
}
