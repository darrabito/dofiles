import LRU from 'lru-cache';
import Promise from 'bluebird'; // jshint ignore:line
import exponentialBackoff from 'iv-exponential-backoff';
import {getSite as fetchSite} from 'api/site';
import _ from 'lodash';
import EventEmitter from 'event-emitter';
import moment from 'moment';
import tree from 'state';

const cache = LRU({
  max: 15,
  maxAge: 1000 * 60 * 60 // 1 hour
});

const inFlightRequests = {};

export default function getSite(domain, url) {
  if (domain.includes('dell') && url && url.match(/dell.com.+\/work\//)) {
    domain = 'dellsmallbusiness.com';
  }
  if (
    domain.includes('verizon.com') &&
    url &&
    url.match(
      /onedp|smartphones|plans|deals|5g|shop-phones-devices|products|phones|prepaid|solutions-and-services|tablets|cases|internet-devices|wireless-devices|connected-devices|wearable-tech|cases|car-and-travel|smart-home|family-tech|fitness|audio|batteries|5g|military|\/featured\/|\/cart\/getCartDetails|od\/cust/
    )
  ) {
    domain = 'verizonwireless.com';
  }
  if (domain.includes('xfinity.com') && url && url.match(/\/mobile\/|\/learn\/mobile-service/)) {
    domain = 'xfinitymobile.com';
  }
  if (domain.includes('staples.com') && url && url.match(/\/services\/printing/)) {
    domain = 'staplescopyandprint.com';
  }
  return new Promise((resolve, reject) => {
    if (!tree.get('session')) {
      return resolve(false);
    }
    if (!domain) {
      return resolve(false);
    }
    const site = cache.get(domain) || cache.get(domain.replace('www.', ''));
    if (site) {
      return resolve(site);
    }

    const inFlightRequest =
      inFlightRequests[domain] || inFlightRequests[domain.replace('www.', '')];
    if (
      inFlightRequest &&
      inFlightRequest.emitter &&
      inFlightRequest.expiration > moment().unix()
    ) {
      inFlightRequest.emitter.on('loaded', resolve);
    } else {
      inFlightRequests[domain] = {
        emitter: EventEmitter(),
        expiration: moment()
          .add(5, 'minutes')
          .unix()
      };

      exponentialBackoff(async () => {
        const json = await fetchSite(domain);
        return json;
      }).then(async json => {
        if (!_.isObject(json)) {
          json = {};
        }

        if (!json.siteData) {
          json.siteData = {};
        }

        if (_.get(json, 'siteData.coupons.items')) {
          const couponData = _.get(json, 'siteData.coupons') || {};
          json.siteData.coupons = _.assign({}, couponData, {
            coupons: _.get(couponData, 'items') || [],
            ignoreSite: _.isUndefined(couponData.ignoreSite) ? true : couponData.ignoreSite,
            ignoreAffiliate: _.isUndefined(couponData.ignoreAffiliate)
              ? true
              : couponData.ignoreAffiliate,
            tld: couponData.tld
          });
        }

        if (_.get(json, 'siteData.coupons.tld')) {
          _.set(json, 'meta.domain', _.get(json, 'siteData.coupons.tld'));
        } else if (json && json.meta && !json.meta.domain) {
          _.set(json, 'meta.domain', domain);
        }
        if (inFlightRequests[domain]) {
          inFlightRequests[domain].emitter.on('loaded', resolve);
          cache.set(domain, json);
          inFlightRequests[domain].emitter.emit('loaded', json);
        }
        delete inFlightRequests[domain];
      });
    }
  });
}

export function setSite(domain, data) {
  cache.set(domain, data);
}

export function resetCache() {
  cache.reset();
}
