import _ from 'lodash';
import couponsMessenger from 'messenger/outbound/couponsMessenger';
import Promise from 'bluebird';

export default async function petcoGcRemovalCheck(domain, result) {
  if (domain === 'petco.com') {
    let orderTotal = _.get(result, 'pageData.order.total');
    const pageType = _.get(result, 'pageType');
    if (pageType === 'checkoutPage' && orderTotal && orderTotal < 3500) {
      try {
        const gcEl = document.querySelector('#petcoGiftCardDisplayArea');
        const gcRows = gcEl.querySelectorAll('[id^=gc_div_]');
        const cachedGc = (await couponsMessenger({message: 'getCachedGc', domain})) || {};
        const {gcLastFour: appliedGcLastFour, orderTotalBeforeApply} = cachedGc;
        if (appliedGcLastFour) {
          const appliedGcRow = _.find(gcRows, row => row.textContent.includes(appliedGcLastFour));
          if (appliedGcRow) {
            const removeButton = appliedGcRow.querySelector('a');
            if (orderTotal >= 2500 && orderTotalBeforeApply < 4500 && removeButton) {
              return;
            }
            removeButton.click();
            await Promise.delay(2000);
          }
        }
      } catch (e) {
        // do nothing
      }
    }
  }
}
