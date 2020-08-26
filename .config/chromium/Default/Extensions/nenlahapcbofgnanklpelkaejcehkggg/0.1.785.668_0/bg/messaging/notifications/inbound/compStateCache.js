import LRU from 'lru-cache';
import tldjs from 'tldjs';

const cache = LRU({
  max: 15,
  maxAge: 1000 * 60 * 10 // 10 minutes
});

export default (data, tab) => {
  const {action, comp} = data;
  const {id, url} = tab;
  const tabID = tldjs.getDomain(url) + id;

  if (action === 'initSavingsCheck') {
    cache.set(`${comp || ''}${tabID}`, true);
  } else if (action === 'endSavingsCheck') {
    cache.del(`${comp || ''}${tabID}`);
  } else if (action === 'getHoneyState' || action === 'getCompState') {
    return cache.get(`${comp || ''}${tabID}`);
  }
};
