import tld from 'tldjs';
import hasFeature from 'utility/hasFeature';
export default function parsePrice(price, sendMetricOnce) {
  let parsedPrice = price.replace(/[^0-9]/gi, '');
  // start new parsePrice functionality
  if (!price.match(/\d+[\t\n\r]*\.[\t\n\r]*\d{2,}/)) {
    const fixedPrice = parseFloat(parsedPrice)
      .toFixed(2)
      .replace(/[^0-9]/gi, '');
    if (sendMetricOnce && fixedPrice !== parsedPrice && hasFeature('roo_price_diff')) {
      sendMetricOnce('track', 'rooPriceDifference', {
        domain: tld.getDomain(location.href),
        pagePath: location.pathname,
        url: location.href,
        parsePriceTotal: parsedPrice,
        fixedPriceTotal: fixedPrice
      });
    }
    parsedPrice = fixedPrice;
  }
  // end new parsePrice functionality
  return parseInt(parsedPrice);
}
