import localStore from 'storage/local';
import {track} from 'utility/analytics';

function log(value) {
  track('c1Prid', {value});
}

export default function updateC1Ref(options = {}) {
  localStore.get('C1_PRID').then(({C1_PRID}) => {
    if (!C1_PRID || options.forceCheck) {
      chrome.cookies.get({url: 'https://capitalone.com', name: 'C1_PRID'}, e => {
        if (e && e.value) {
          log(e.value);
          localStore.set({C1_PRID: e.value});
        }
      });
    } else {
      if (options.logCurrent) {
        log(C1_PRID);
      }
    }
  });
}
