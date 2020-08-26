import _ from 'lodash';

export default function checkSiteUserCouponCriteria(domain, deweyResult) {
  if (domain === 'petco.com') {
    const totalFromDeweyResult = _.get(deweyResult, 'pageData.order.total');
    return totalFromDeweyResult >= 3500; // $35;
  } else {
    return true;
  }
}
