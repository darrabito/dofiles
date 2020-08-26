import moment from 'moment';
import _ from 'lodash';
import findHotel from 'messenger/outbound/findHotel';

let offerChangeCallback;
let searchId = 0;
let latestSearchId;
let updatedHotel;

function formatPrice(p) {
  const amount = parseFloat(p.replace(/[^0-9]/g, ''));
  if (p.indexOf('.') !== -1) {
    return parseInt(amount);
  } else {
    return parseInt(amount * 100);
  }
}

function getInputData() {
  searchId += 1;
  const hotelModule = document.querySelector('.gws-local-hotels__booking-module');
  const latLng = hotelModule
    .getAttribute('data-async-context')
    .match(/lat\:([0-9-,.]+);.*lng\:([0-9-,.]+);/);
  let latitude, longitude;
  if (latLng) {
    latitude = latLng[1] / 10000000;
    longitude = latLng[2] / 10000000;
  }
  const offerPriceAttribute = 'data-dp';
  const offers = Array.from(document.querySelectorAll(`[${offerPriceAttribute}]`));
  const sortedOffers = offers.sort(
    (offerA, offerB) =>
      formatPrice(offerA.getAttribute(offerPriceAttribute)) -
      formatPrice(offerB.getAttribute(offerPriceAttribute))
  );
  const lowestPrice = sortedOffers.length
    ? formatPrice(sortedOffers[0].getAttribute(offerPriceAttribute))
    : -1;
  return {
    title: document.querySelector('[data-local-attribute="d3bn"]').innerText,
    address: document
      .querySelector('[data-local-attribute="d3adr"] > span:nth-child(2)')
      .innerText.split(',')[0],
    price: lowestPrice,
    checkIn: moment(document.querySelector('[data-luh-i]').getAttribute('data-luh-i')).format(
      'MM/DD/YYYY'
    ),
    checkOut: moment(document.querySelector('[data-luh-o]').getAttribute('data-luh-o')).format(
      'MM/DD/YYYY'
    ),
    rooms: 1,
    adults: 2,
    children: 0,
    latitude,
    longitude,
    searchId,
    url: location.href
  };
}

async function updateSearch() {
  const data = getInputData();
  latestSearchId = data.searchId;
  if (offerChangeCallback) {
    offerChangeCallback({loading: true});
  }
  const hotel = await findHotel(
    _.assign(
      {
        domain: location.hostname.replace(/^www\./, ''),
        pagePath: location.pathname
      },
      data
    )
  );
  if (latestSearchId === data.searchId) {
    updatedHotel = hotel;
  }
  if (offerChangeCallback) {
    offerChangeCallback(updatedHotel);
  }
}

export default async () => {
  const hotelModule = document.querySelector('.gws-local-hotels__booking-module');

  if (hotelModule) {
    const langAndCountryCode = hotelModule.parentElement.getAttribute('lang');
    const isUSD = langAndCountryCode && langAndCountryCode.match(/[a-z]+-US/);
    if (!isUSD) return;

    const inputData = getInputData();
    const debouncedUpdateSearch = _.debounce(updateSearch, 1000);
    const observer = new MutationObserver(debouncedUpdateSearch);
    observer.observe(document.querySelector('[data-async-type="updateHotelBookingModule"]'), {
      childList: true
    });
    return {
      ...inputData,
      props: {
        registerOfferChangeCallback: cb => {
          offerChangeCallback = cb;
          if (updatedHotel) {
            setTimeout(() => offerChangeCallback(updatedHotel), 0);
          }
        },
        showNightlyRate: true
      }
    };
  }
};
