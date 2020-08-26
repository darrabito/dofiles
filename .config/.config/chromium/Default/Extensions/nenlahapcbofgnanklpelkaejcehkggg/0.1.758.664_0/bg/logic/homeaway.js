import xhr from '../utility/xhr';
import _ from 'lodash';
import {WIKIBUY_API} from 'constants';
import getSite from 'cache/siteCache';
import {getCashbackByTag} from 'cache/cashbackCache';
import hasFeature from 'utility/hasFeature';
import Promise from 'bluebird';

export default async function search(data) {
  const includeSimilarResults = hasFeature('hma_sim_results');
  if (includeSimilarResults) {
    _.set(data, 'priceSimilarResults', true);
  }
  const allowUnquotedResults = hasFeature('hma_unquoted_results');
  if (allowUnquotedResults) {
    _.set(data, 'allowUnquotedResults', true);
  }
  let cashback = await getCashbackByTag({domain: 'vrbo.com', tag: 'price-comparison'});
  if (!_.get(cashback, 'reward.amount')) {
    const siteAPIData = await getSite('vrbo.com');
    cashback = _.get(siteAPIData, 'siteData.cashback');
  }
  const resp = await xhr('POST', `${WIKIBUY_API}/homeaway/get_match`, data);
  return {
    results: includeSimilarResults ? resp : _.filter(resp, r => r.exactMatch),
    cashback
  };
}
