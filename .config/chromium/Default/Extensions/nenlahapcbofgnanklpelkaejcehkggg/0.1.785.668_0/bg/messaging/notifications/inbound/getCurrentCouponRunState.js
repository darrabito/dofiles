import {getCurrentCouponRunState} from 'logic/headlessCoupons';

export default async data => {
  return getCurrentCouponRunState(data);
};
