import {React} from 'utility/css-ns';
import Deals from 'pages/Deals';
import {Route} from 'react-router';
import currentDomain from 'utility/currentDomain';
import loadApp from 'utility/loadApp';
import sendMetric from 'utility/sendMetric';
import setBrowserAction from 'messenger/outbound/setBrowserAction';
import findDeal from 'messenger/outbound/findDeal';
import tree from 'state';
import initSite from 'content/deals';

function shouldDisplay() {
  return tree.get('checkingHotels') !== true && tree.get('hotelView') === undefined;
}

async function checkForDeal(data) {
  if (data) {
    tree.set('pageViewId', window.__wb_page_view_id);

    sendMetric('track', 'bizDealSearch', {
      ...data,
      domain: currentDomain(),
      pagePath: location.pathname,
      url: location.href
    });

    const deal = await findDeal(data);
    if (!deal) return;

    tree.set('pendingDealsView', {
      deal,
      queryData: data
    });

    if (shouldDisplay()) {
      displayDealsViewIfDeal();
    } else {
      tree.set('displayDealsViewIfDeal', displayDealsViewIfDeal);
    }
  }
}

function displayDealsViewIfDeal() {
  const viewData = tree.get('pendingDealsView');
  if (!viewData) return;

  setBrowserAction({active: true});

  tree.set('dealsView', viewData);

  loadApp({
    initialRoute: '/deals',
    cssUrl: 'GENERATED/deals.css',
    route: <Route path="deals" component={Deals} />
  });

  tree.set('pendingDealsView', undefined);
}

async function init() {
  const data = await initSite();
  checkForDeal(data);
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
