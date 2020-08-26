import _ from 'lodash';

export default function checkSiteUserCouponCriteria(domain, deweyResult) {
  switch (domain) {
    case 'petco.com': {
      const totalFromDeweyResult = _.get(deweyResult, 'pageData.order.total');
      return totalFromDeweyResult >= 3500; // $35;
    }
    case 'officedepot.com': {
      const totalFromDeweyResult = _.get(deweyResult, 'pageData.order.total');
      return _.get(deweyResult, 'pageType') === 'checkoutPage' && totalFromDeweyResult >= 2500; //$25
    }
    default: {
      return true;
    }
  }
}
