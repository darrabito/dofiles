import tree from 'state';

export default data => {
  return tree.get(['ebatesActivatedSites', data.tld]);
};
