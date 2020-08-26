import tree from 'state';

export default data => {
  return tree.get(['honeyActivatedSites', data.tld]);
};
