import _ from 'lodash';
export default function (err) {
  let error;
  if (err && err.responseText) {
    try {
      error = _.get(JSON.parse(err.responseText), 'error');
    } catch (err) {
      error = null;
    }
  }
  return error;
}