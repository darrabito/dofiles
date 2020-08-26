import {activateInPinnedTab} from 'logic/cashback';

export default (data = {}, tab) => {
  return activateInPinnedTab({
    url: tab.url,
    tabId: tab.id,
    pageViewId: data.pageViewId,
    domain: data.domain,
    affiliateUrl: data.affiliateUrl,
    clickId: data.clickId,
    preventPinnedTab: data.preventPinnedTab,
    coupons: data.coupons,
    vendorMetaId: data.vendorMetaId,
    fromAutoRun: data.fromAutoRun
  });
};
