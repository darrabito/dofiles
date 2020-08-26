import tree from 'state';
import getPriceFromSelector from './getPriceFromSelector';
import _ from 'lodash';
import delay from './delay';
import parsePrice from './parsePrice';
import hasFeature from 'utility/hasFeature';

function getLightningDealPricing() {
  // check if its a lightning deal and valid
  const lightningDealBBText = _.get(document.querySelector('#LDBuybox'), 'innerText') || _.get(document.querySelector('#dealsAccordionRow'), 'innerText');
  const claimedText = _.get(document.querySelector('#deal_availability'), 'innerText') || _.get(document.querySelector('[id^="deal_status_progress"]'), 'innerText');
  if (!/lightning\s+deal/i.test(lightningDealBBText) || /100%\s*claimed/i.test(claimedText)) return;

  // unclaimed lightning deal
  const priceMatches = lightningDealBBText.match(/\$([\d\.]+)/) || [];
  return priceMatches.length && parsePrice(priceMatches[1]);
}

function findPrice() {
  const selectors = [
    '#buyDealSection .offer-price',
    '#priceblock_saleprice',
    '#priceblock_ourprice',
    '.a-accordion-active #addToCart .header-price',
    '#unqualifiedBuyBox .a-color-price',
    '#olp_feature_div a',
    '#new-button-price',
    '#priceblock_dealprice:not(.a-hidden)'
  ];

  let price;
  if (hasFeature('enable_lightning_deal_pricing') && tree.get(['settings', 'prime'])) {
    price = getLightningDealPricing();
  }

  _.forEach(selectors, s => {
    if (price) {
      return;
    }
    price = getPriceFromSelector(s, true);
  });
  return price;
}

export async function getPriceAsync(retries) {
  let price = findPrice();
  while (!price && retries > 0) {
    await delay(100);
    price = findPrice();
    --retries;
  }
  return price;
}

export default function getPrice() {
  return findPrice();
}
