import tree from 'state';

export default (data, tab) => {
  return {
    airbnbDetailsUrl: tree.get(['airbnbDetailsUrl']),
    airbnbDetailsHeaders: tree.get(['airbnbDetailsHeaders'])
  };
};
