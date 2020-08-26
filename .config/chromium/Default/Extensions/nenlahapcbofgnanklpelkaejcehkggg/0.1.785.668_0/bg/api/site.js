import xhr from 'utility/xhr';
import getExtensionType from 'utility/getExtensionType';
import {SITE_API, SITE_API_V3, WIKIBUY_API} from '../constants';
import tree from 'state';
import _ from 'lodash';

function getRanker() {
  const features = tree.get(['session', 'features']) || [];
  const ranker = _.find(features, f => _.startsWith(f, 'c_ranker_'));
  if (ranker) {
    return ranker.split('c_ranker_')[1];
  }
}

export async function getSite(domain) {
  if (/\//.test(domain)) {
    // Some shopify sites have a '/' in them
    return {
      meta: {}
    };
  }
  const ranker = getRanker();
  const API = WIKIBUY_API;
  const url = `${API}/site/${domain}?extension=${getExtensionType()}${
    ranker ? `&ranker=${ranker}` : ''
  }`;
  return await xhr('GET', url);
}

export async function getBloom() {
  return await xhr('GET', `${SITE_API}/blacklist_bloom`);
}

export async function getCashbackByTag({domain, tag}) {
  return await xhr('GET', `${SITE_API_V3}/site/${domain}/cashback?tag=${tag}`);
}
