import invoke, {invokeLocal} from 'messenger';

export default data => {
  const search = document.location.search;
  const sellerId = _.get(search.match(/smid=([^&]+)/), '[1]') || _.get(search.match(/m=([^&]+)/), '[1]');
  if (sellerId) {
    data.sellerId = sellerId;
  }
  invokeLocal('resetNotification');
  invokeLocal('setInputData', {inputData: data});
  return invoke('asin', data).then(resp => {
    if (resp && resp.runId) {
      invokeLocal('setRunId', {runId: resp.runId});
    }
  });
};
