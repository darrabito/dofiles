import _ from 'lodash';
import {React} from 'utility/css-ns';
import MirageNotification from 'pages/MirageNotification';
import {Route} from 'react-router';
import loadApp from 'utility/loadApp';
import siteCache from 'messenger/outbound/siteCache';
import {getContentApiNotification} from 'actions/contentApiActions';
import dewey from 'utility/dewey';
import tree from 'state';
import $ from 'jquery';
import currentDomain from 'utility/currentDomain';
import couponsMessenger from 'messenger/outbound/couponsMessenger';

window.__wb_timing.mirageNoteRequireAt = performance.now();

let notificationLoaded;

async function evaluateIdentifiers(identifiers) {
  if (!identifiers) {
    return;
  }
  const deweyDoc = document;
  deweyDoc.deweyParser = $;
  deweyDoc.html = document.documentElement.innerHTML;
  const result = await dewey.evaluateIdentifierTree(identifiers, deweyDoc);
  if (result) {
    return true;
  }
}

async function checkToShowNotification(deweyResult) {
  if (notificationLoaded) {
    return;
  }
  const notification = await getContentApiNotification({deweyResult}); // todo: add error handling; cache this
  const throttleDurationMs = _.get(notification, 'throttleDurationMs');
  const isThrottled = await couponsMessenger({
    domain: currentDomain(),
    message: 'checkThrottled',
    throttleDurationMs
  });
  if (isThrottled) {
    return;
  }
  notificationLoaded = true;
  if (
    notification &&
    !notification.error &&
    (_.get(notification, 'heading.value') ||
      _.get(notification, 'subheading.value') ||
      _.get(notification, 'cta.value'))
  ) {
    tree.set('mirageNotification', notification);
    loadApp({
      initialRoute: '/mirageNotification',
      cssUrl: 'GENERATED/mirageNotification.css',
      route: <Route path="mirageNotification" component={MirageNotification} />
    });
  }
}

async function init() {
  try {
    const {siteData} = await siteCache();
    const res = await evaluateIdentifiers(_.get(siteData, 'mirageNotification.identifiers'));
    if (!res) {
      dewey.emitter.on('result', async result => {
        const shouldShow = await evaluateIdentifiers(
          _.get(siteData, 'mirageNotification.identifiers')
        );
        if (shouldShow) checkToShowNotification(result);
      });
      return;
    }
    if (tree.get(['deweyResult'])) {
      checkToShowNotification(tree.get(['deweyResult']));
    }
  } catch (e) {}
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
