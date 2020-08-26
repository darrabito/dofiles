import xhr from 'utility/xhr';
import queryString from 'querystring';

export function sendOutbrainEvent(eventName) {
  const outbrainParams = {
    marketerId: '00671e9a95856f902a38714260c5dcf31f',
    obApiVersion: '1.0.11',
    name: eventName,
    dl: 'https://wikibuy.com/onboarding',
    optOut: 'false',
    bust: Math.random()
      .toString()
      .replace('.', '')
  };

  return xhr(
    'GET',
    `https://tr.outbrain.com/pixel?${queryString.stringify(outbrainParams)}`,
    null,
    null,
    {}
  );
}

export function sendPinterestEvent(eventName) {
  return xhr(
    'GET',
    `https://ct.pinterest.com/v3/?tid=2618775727002&event=${eventName}&noscript=1`,
    null,
    null,
    {}
  );
}

export function sendTaboolaEvent(eventName) {
  return xhr('GET', `https://trc.taboola.com/1060689/log/3/unip?en=${eventName}`, null, null, {});
}

export function sendQuoraEvent(eventName) {
  const params = {
    j: 1,
    u: 'https://wikibuy.com/onboarding',
    tag: eventName,
    ts: new Date().getTime()
  };

  return xhr(
    'GET',
    `https://q.quora.com/_/ad/78cf4c68738e45e4a201208fbc6c734c/pixel?${queryString.stringify(
      params
    )}`,
    null,
    null,
    {}
  );
}
