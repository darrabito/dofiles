import tree from 'state';
import getPriceFromSelector from './getPriceFromSelector';
import regex from './regex';

const FREE_SHIPPING_THRESHOLD = 3500;

const FREE_SHIPPING_MSG_EL_ID = 'pantryStoreMessage_feature_div';
const NAVBAR_EL_ID = 'nav-subnav';
const MERCHANT_INFO_ID = 'merchant-info';
const DEFAULT_SHIPPING_SELECTOR = '#ourprice_shippingmessage .a-color-secondary';
const POPOVER_SHIPPING_DETAILS_SELECTOR = '#a-popover-shippingDetailsDisplayContent';
const SOLD_BY_PRIME_PANTRY_REGEX = /ships from and sold by prime pantry/i;
const PANTRY_FREE_SHIPPING_THRESHOLD_REGEX = /FREE shipping on all Prime Pantry orders over \$\d+/i;
const PAID_SHIPPING_REGEX = /or get.*shipping on this item for \$[\d\.]+/i;
const GET_FREE_SHIPPING_REGEX = /get free shipping/i;

function getPantryFreeShippingThreshold() {
  const el = document.getElementById(FREE_SHIPPING_MSG_EL_ID);
  if (el && el.innerText && PANTRY_FREE_SHIPPING_THRESHOLD_REGEX.test(el.innerText)) {
    const threshold = regex(/\$(\d+)/, el.innerText.trim());
    return parseInt(threshold) * 100;
  }
  return FREE_SHIPPING_THRESHOLD;
}

export default function getShipping(price) {
  const dataCategoryEl = document.getElementById(NAVBAR_EL_ID);
  const dataCategory = dataCategoryEl && dataCategoryEl.getAttribute('data-category');
  const merchantInfoEl = document.getElementById(MERCHANT_INFO_ID);
  const merchantInfo = merchantInfoEl && merchantInfoEl.innerText;
  const isPantry = /pantry/i.test(dataCategory) || SOLD_BY_PRIME_PANTRY_REGEX.test(merchantInfo);
  const userIsPrime = tree.get(['settings', 'prime']);

  const freeShippingThreshold = getPantryFreeShippingThreshold();
  if (userIsPrime && isPantry && price >= freeShippingThreshold) {
    return 0;
  } else if (isPantry) {
    return 599;
  } else if (document.querySelector(POPOVER_SHIPPING_DETAILS_SELECTOR)) {
    const innerText = document.querySelector(POPOVER_SHIPPING_DETAILS_SELECTOR).innerText;
    if (GET_FREE_SHIPPING_REGEX.test(innerText) && PAID_SHIPPING_REGEX.test(innerText)) {
      const shippingCost = regex(/on this item for \$([\d\.]+)/i, innerText);
      if (shippingCost) {
        return parseFloat(shippingCost) * 100;
      }
    }
  }

  return getPriceFromSelector(DEFAULT_SHIPPING_SELECTOR);
}