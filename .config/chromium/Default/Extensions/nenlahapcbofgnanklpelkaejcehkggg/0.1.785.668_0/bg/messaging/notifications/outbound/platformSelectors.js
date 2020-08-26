import { invokeInTab } from '../index';

export default (tabId, selectors) => {
  return invokeInTab(tabId, 'platformSelectors', selectors);
};
