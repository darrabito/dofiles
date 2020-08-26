import _ from 'lodash';

export default data => {
  return _.map(data, selector => {
    return {selector, present: Boolean(document.querySelector(selector))};
  });
};
