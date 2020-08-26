import {React} from 'utility/css-ns';
import Consent from 'pages/Consent';
import {Route} from 'react-router';
import loadApp from 'utility/loadApp';

async function init() {
  if (window.wbConsentNotificationLoaded) {
    return;
  }
  window.wbConsentNotificationLoaded = true;
  loadApp({
    initialRoute: '/consent',
    cssUrl: 'GENERATED/consent.css',
    route: <Route path="consent" component={Consent} />,
    disableDelay: true
  });
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
