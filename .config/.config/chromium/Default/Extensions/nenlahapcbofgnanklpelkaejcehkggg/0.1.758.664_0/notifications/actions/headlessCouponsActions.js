import tree from 'state';
import moment from 'moment';
import couponsMessenger from 'messenger/outbound/couponsMessenger';
import currentDomain from 'utility/currentDomain';
import runPinnedTab from 'messenger/outbound/pinnedTab';
import getCustomAffiliateUrl from 'utility/customAffiliateUrl';
import {WIKIBUY_API} from 'constants';

export function throttleNotification(triedCodes) {
  const domain = currentDomain();
  if (domain !== 'amazon.com') {
    couponsMessenger({domain, message: 'triedCodes'});
  }
}

export async function dropCookie(clickId) {
  if (
    !(
      tree.get(['couponsDisabledSites', `${currentDomain()}_${tree.get('tabId')}`]) >
      moment().unix()
    ) &&
    !(tree.get(['couponsDisabledSites', `${currentDomain()}_all`]) > moment().unix()) &&
    !(
      tree.get(['couponsAffiliateDisabledSites', `${currentDomain()}_${tree.get('tabId')}`]) >
      moment().unix()
    ) &&
    !(tree.get(['couponsAffiliateDisabledSites', `${currentDomain()}_all`]) > moment().unix())
  ) {
    try {
      const affiliateLink = `${WIKIBUY_API}/redirect?url=http://${currentDomain()}&clickId=${clickId}&channel=coupons&r=1`;
      const url = getCustomAffiliateUrl(currentDomain(), clickId) || affiliateLink;
      if (url) {
        const pinId = 'coupons' + clickId;
        runPinnedTab({
          url,
          id: pinId,
          timeout: 10000,
          cb: {
            type: 'aff'
          }
        });
      }
    } catch (e) {}
  }
}
