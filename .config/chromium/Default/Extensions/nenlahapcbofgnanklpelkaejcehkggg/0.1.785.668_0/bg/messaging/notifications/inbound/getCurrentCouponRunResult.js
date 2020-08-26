import {getCurrentCouponRunResult} from 'logic/headlessCoupons';

export default async data => {
  return getCurrentCouponRunResult(data);
};
