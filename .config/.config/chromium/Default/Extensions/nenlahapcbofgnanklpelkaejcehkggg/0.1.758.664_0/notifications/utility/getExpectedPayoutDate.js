import moment from 'moment';
import _ from 'lodash';

export default function(payoutPeriodData) {
  const guaranteedPayoutDate = _.reduce(
    payoutPeriodData,
    (date, units, value) => date.add(value, units),
    moment()
  );
  return guaranteedPayoutDate.add(1, 'days').format('MMMM Do');
}
