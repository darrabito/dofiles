import Promise from 'bluebird';
import xhr from 'utility/xhr';
import * as analytics from 'utility/analytics';

export default async data => {
  const {domain, SITE_API_V3} = data;
  return new Promise(async (resolve, reject) => {
    try {
      const url = `${SITE_API_V3}/user_coupon/${domain}`;
      const res = await xhr('GET', url);
      resolve(res);
    } catch (e) {
      analytics.track('userCodeFetchError', {error: e, domain: domain});
      resolve(false);
    }
  }).timeout(3000);
};
