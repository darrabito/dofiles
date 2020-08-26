import invoke from 'messenger';
import sendMetric from 'utility/sendMetric';
import currentDomain from 'utility/currentDomain';
import hasFeature from 'utility/hasFeature';
import isEdge from 'utility/isEdge';
import siteCache from 'messenger/outbound/siteCache';
import _ from 'lodash';

export default async data => {
  const domain = data.domain || currentDomain();
  const siteAPIData = await siteCache(domain);
  const haEnabled = _.get(siteAPIData, 'meta.hae', false);
  data.domain = domain;
  return invoke('activatePinnedTab', data).then(res => {
    if (res && !res.error && !hasFeature('disable_mark_request') && !isEdge() && haEnabled) {
      window.location.href = `${window.location.protocol}//${window.location.hostname}${
        window.location.pathname
      }?afsrc=1&ha=1`;
      sendMetric('track', 'markAfsrc', {
        domain: res.domain
      });
    }
    return res;
  });
};
