import {React} from 'utility/css-ns';
import Hotel from 'pages/Hotel';
import HomeawayNotification from 'pages/HomeawayNotification';
import Root from 'components/Root';
import loadApp from 'utility/loadApp';
import setBrowserAction from 'messenger/outbound/setBrowserAction';
import findHotel from 'messenger/outbound/findHotel';
import tree from 'state';
import initSite from 'content/hotels';
import getUser from 'messenger/outbound/getUser';
import getAirbnbDetails from 'messenger/outbound/getAirbnbDetails';
import findHomeawayListing from 'messenger/outbound/findHomeawayListing';
import Promise from 'bluebird';
import _ from 'lodash';

window.__wb_timing.hotelRequireAt = performance.now();

async function fetchInitialData() {
  const [userResp, airbnbResp] = await Promise.all([getUser(), getAirbnbDetails()]);
  if (userResp) {
    tree.set('session', _.get(userResp, 'session'));
    tree.set('events', _.get(userResp, 'settings.events'));
    tree.set('settings', _.get(userResp, 'settings'));
    tree.set('pageViewId', window.__wb_page_view_id);
    tree.set('tabId', _.get(userResp, 'tabId'));
  }

  if (airbnbResp) {
    tree.set('airbnbDetailsUrl', _.get(airbnbResp, 'airbnbDetailsUrl'));
    tree.set('airbnbDetailsHeaders', _.get(airbnbResp, 'airbnbDetailsHeaders'));
  }
}

function createApp(props) {
  return (
    <Root>
      <Hotel {...props} />
    </Root>
  );
}

function createHomeawayApp(props = {}) {
  return (
    <Root>
      <HomeawayNotification {...props} />
    </Root>
  );
}

async function checkForHotel(data) {
  const {props, ...rest} = data;
  const hotel = await findHotel(
    _.assign(
      {
        domain: location.hostname.replace(/^www\./, ''),
        pagePath: location.pathname
      },
      rest
    )
  );
  tree.set('checkingHotels', false);
  if (_.isArray(hotel) && hotel.length) {
    setBrowserAction({active: true});
    tree.set('hotelView', {
      hotels: hotel
    });
    loadApp({
      initialRoute: '/hotel',
      cssUrl: 'GENERATED/hotel.css',
      app: createApp(props)
    });
  } else if (hotel && (hotel.discount || hotel.cashback)) {
    setBrowserAction({active: true});
    tree.set('hotelView', {
      hotel
    });
    loadApp({
      initialRoute: '/hotel',
      cssUrl: 'GENERATED/hotel.css',
      app: createApp(props)
    });
  } else {
    const displayDealsViewIfDeal = tree.get('displayDealsViewIfDeal');

    if (typeof displayDealsViewIfDeal === 'function') {
      displayDealsViewIfDeal();
    }
  }
}

async function checkHomeawayListing(data) {
  const {props, ...input} = data;
  const resp = await findHomeawayListing(input);
  tree.set('checkingHotels', false);
  if (resp && resp.results && resp.results.length) {
    setBrowserAction({active: true});
    tree.set('homeawayView', {
      listing: resp,
      sourceListing: input.data
    });
    loadApp({
      initialRoute: '/hotel',
      cssUrl: 'GENERATED/hotel.css',
      app: createHomeawayApp(props)
    });
  }
}

async function init() {
  tree.set('checkingHotels', true);
  await fetchInitialData();
  try {
    const data = await initSite();
    if (data && data.type === 'homeawaySearch') {
      checkHomeawayListing(data);
    } else if (data && !data.error) {
      checkForHotel(data);
    } else {
      // If no input data was returned and the hotels search is skipped entirely,
      // mark that we're no longer checking hotels to allow deals notifications to appear
      //
      tree.set('checkingHotels', false);
    }
  } catch (e) {
    console.log(e);
  }
}
if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
