import LRU from 'lru-cache';
import Promise from 'bluebird'; // jshint ignore:line
import exponentialBackoff from 'iv-exponential-backoff';
import {getCashbackByTag as fetchCashbackByTag} from 'api/site';

const cache = LRU({
  max: 15,
  maxAge: 1000 * 60 * 10 // 10 min
});

export function clear() {
  cache.reset();
}

export function getCashbackByTag({domain, tag}) {
  const cacheKey = `cashback:${domain}:${tag}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) {
    return Promise.resolve(cacheResult);
  }
  return exponentialBackoff(async () => {
    const json = await fetchCashbackByTag({domain, tag});
    return json;
  }).then(json => {
    cache.set(cacheKey, json);
    return json;
  });
}

export default cache;
