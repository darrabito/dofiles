const BAD_PRICE_THRESHOLD = 1000000;

function validPrice(price) {
  return price < BAD_PRICE_THRESHOLD;
}

export function convertPrice(p) {
  if (p) {
    if (p.toLowerCase().indexOf('free') !== -1) {
      return 0;
    }
    const usedAndNewText = p.match(/(?:used\s&\s)?new/i);
    const newAndUsedMatches = p.match(/from (\$[^\+]*)/i);
    if (newAndUsedMatches && newAndUsedMatches.length && newAndUsedMatches[1]) {
      return parseInt(newAndUsedMatches[1].replace(/[^0-9]/gi, ''));
    }

    // to prevent cases where "Used & new (21)" would be parsed as "21"
    if (usedAndNewText && !newAndUsedMatches) {
      return 0;
    }
    return parseInt(p.replace(/[^0-9]/gi, ''));
  }
}

export default function getPriceFromSelector(selector, oneSelector) {
  let el;
  if (oneSelector) {
    const els = document.querySelectorAll(selector);
    if (els.length !== 1) {
      return 0;
    } else {
      el = els[0];
    }
  } else {
    el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  }

  if (el) {
    const price = convertPrice(el.innerText);
    if (validPrice(price)) {
      return price;
    }
  }
  return 0;
}
