import Bluebird from 'bluebird';
import moment from 'moment';
import delay from 'utility/delay';
import hasFeature from 'utility/hasFeature';
import findHomeawayListing from 'messenger/outbound/findHomeawayListing';
import querystring from 'querystring';
import _ from 'lodash';
import regex from 'utility/regex';
import tree from 'state';

let offerChangeCallback;

const LISTING_DATA_SELECTOR_MAP = {
  bathrooms: [{sectionComponentType: 'OVERVIEW_DEFAULT', path: 'section.details.3.title'}],
  beds: [{sectionComponentType: 'OVERVIEW_DEFAULT', path: 'section.details.2.title'}],
  bedrooms: [{sectionComponentType: 'OVERVIEW_DEFAULT', path: 'section.details.1.title'}],
  guests: [{sectionComponentType: 'OVERVIEW_DEFAULT', path: 'section.details.0.title'}],
  addressParts: [
    {sectionComponentType: 'LOCATION_DEFAULT', path: 'section.subtitle'},
    {sectionComponentType: 'TITLE_DEFAULT', path: 'section.overviewItems.2.title'},
    {sectionComponentType: 'TITLE_DEFAULT', path: 'section.overviewItems.1.title'}
  ],
  hostName: [{sectionComponentType: 'OVERVIEW_DEFAULT', path: 'section.shortTitle'}],
  rooms: [{sectionComponentType: 'OVERVIEW_DEFAULT', path: 'section.details.2.title'}],
  lat: [{sectionComponentType: 'LOCATION_DEFAULT', path: 'section.lat'}],
  long: [{sectionComponentType: 'LOCATION_DEFAULT', path: 'section.lng'}],
  title: [{sectionComponentType: 'TITLE_DEFAULT', path: 'section.title'}],
  description: [{sectionComponentType: 'DESCRIPTION_DEFAULT', path: 'section.htmlDescription.htmlText'}]
};

const PRICE_TEXT_SELECTORS = [
  '#book_it_form',
  '[data-test-id="book-it-default"] + ul + div',
  '[data-plugin-in-point-id="BOOK_IT_SIDEBAR"]'
];

function formatPrice(p) {
  const amount = parseFloat(p.replace(/[^0-9]/g, ''));
  if (p.indexOf('.') !== -1) {
    return parseInt(amount);
  } else {
    return parseInt(amount * 100);
  }
}

function getTextFromSelector(selector) {
  return document.querySelector(selector) ? document.querySelector(selector).innerText : undefined;
}

function getTotalPrice() {
  try {
    return _.chain(PRICE_TEXT_SELECTORS)
      .find(getTextFromSelector) // find the selector that has innerText
      .thru(getTextFromSelector) // get the innerText
      .split('\n')
      .thru(lines => {
        // sometimes the word "total" and the price are on the same line
        // if not, get the price from the next line
        let totalLine = _.find(
          lines,
          line => !/per night/i.test(line) && /total/i.test(line) && /\$[\d,]+/i.test(line)
        );
        if (!totalLine) {
          const totalIdx = _.findIndex(
            lines,
            line => !/per night/i.test(line) && /total/i.test(line)
          );
          if (totalIdx && /\$[\d,]+/.test(lines[totalIdx + 1])) {
            totalLine = lines[totalIdx + 1];
          }
        }
        return totalLine;
      })
      .thru(totalLine => totalLine && formatPrice(regex(/(\$[\d,]+)/, totalLine)))
      .value();
  } catch (e) {}
}

function isLoaded(data) {
  const price = getTotalPrice();
  if (price) {
    data.price = price;
  }
  return price;
}

function getListingData(listingId, inputData) {
  const sections = _.get(inputData, 'details.data.merlin.pdpSections.sections');

  let data = {};
  try {
    if (sections) {
      data = _.reduce(
        LISTING_DATA_SELECTOR_MAP,
        (result, selectors, key) => {
          _.forEach(selectors, selectorData => {
            if (result[key]) return;
            const {sectionComponentType, path} = selectorData;
            const sectionData = _.find(sections, {sectionComponentType});
            if (!sectionData) return;
            let value = _.get(sectionData, path);
            if (value) {
              if (key === 'hostName') {
                value = value.replace('hosted by ', '');
              }
              _.set(result, key, value);
            }
          });
          return result;
        },
        {}
      );
    }

    if (data.addressParts) {
      const addressParts = data.addressParts.split(',');
      if (addressParts && addressParts.length === 3) {
        data.city = addressParts[0].trim();
        data.state = addressParts[1].trim();
        data.country = addressParts[2].trim();
      }
    }

    const pageDetails = getTextFromSelector('#details');
    if (pageDetails) {
      const areaMatch = regex(/(\d+\s*(sq(uare)?[.\s]*f(ee)?t|sq(uare)?[.\s]* m(eters)?))/i, pageDetails);
      if (areaMatch) {
        data.area = parseInt(regex(/(\d+)/, areaMatch));
        data.areaUnit = regex(/(sq(uare)?[.\s]*f(ee)?t|sq(uare)?[.\s]*m(eters)?)/i, areaMatch);
      }
    }

    data.guests = data.guests && data.guests.split(' ')[0].trim();
    data.bedrooms = data.bedrooms && data.bedrooms.split(' ')[0].trim();
    data.bathrooms = data.bathrooms && data.bathrooms.split(' ')[0].trim();

    // if we have found some listing data, add the listingId and return
    if (_.some(data)) {
      return {
        listingId,
        title: data.title,
        hostName: data.hostName,
        guests: data.guests,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        lat: data.lat,
        long: data.long,
        city: data.city,
        state: data.state,
        country: data.country,
        area: data.area,
        areaUnit: data.areaUnit,
        description: data.description
      };
    }
  } catch (e) {}
}

function getInputData(data) {
  try {
    const allowUnquotedResults = hasFeature('hma_unquoted_results');
    const price = getTotalPrice();
    if (!price && !allowUnquotedResults) {
      return;
    }

    const listingId = regex(/\/rooms(?:\/plus)?\/(\d+)/i, location.href);
    const listing = getListingData(listingId, data) || {};
    const urlQuery = querystring.parse(location.search.substring(1));
    const adults = urlQuery.adults;
    const children = String(Math.max(0, parseInt(urlQuery.guests || 0) - parseInt(urlQuery.adults || 0)));
    const arrivalDate = moment(urlQuery.check_in, 'YYYY-MM-DD').format('MM/DD/YYYY');
    const departureDate = moment(urlQuery.check_out, 'YYYY-MM-DD').format('MM/DD/YYYY');
    if (!allowUnquotedResults && (arrivalDate === 'Invalid date' || departureDate === 'Invalid date')) {
      return;
    }

    return {
      type: 'homeawaySearch',
      data: {
        listingId: `airbnb.com_${listingId}`,
        price,
        arrivalDate: arrivalDate !== 'Invalid date' ? arrivalDate : undefined,
        departureDate: departureDate !== 'Invalid date' ? departureDate : undefined,
        adults,
        children,
        ...listing
      }
    };
  } catch (e) {}
}

async function updateSearch(data) {
  const inputData = getInputData(data);
  const scrapedData = _.get(inputData, 'data') || {};

  // make sure data has changed so we aren't firing too many search requests
  const noPriceChange = scrapedData.price === data.price;
  const noDateChange = scrapedData.arrivalDate === data.arrivalDate
    && scrapedData.departureDate === data.departureDate;

  // keep track of the last price and dates we scraped
  data.price = scrapedData.price;
  data.arrivalDate = scrapedData.arrivalDate;
  data.departureDate = scrapedData.departureDate;
  if (_.isEmpty(scrapedData) || !scrapedData.price || (noPriceChange && noDateChange)) {
    return;
  }

  if (offerChangeCallback) {
    offerChangeCallback({loading: true});
  }
  if (!_.isEmpty(inputData)) {
    const listing = await findHomeawayListing(
      _.assign(
        {
          domain: location.hostname.replace(/^www\./, ''),
          pagePath: location.pathname
        },
        inputData
      )
    );
    if (offerChangeCallback) {
      offerChangeCallback(listing, inputData.data);
    }
  }
}

async function getDetails() {
  const detailsUrl = tree.get('airbnbDetailsUrl');
  const detailsHeaders = tree.get('airbnbDetailsHeaders');
  if (!detailsUrl || !detailsHeaders) {
    return;
  }

  const mappedHeaders = {};
  _.forEach(detailsHeaders, header => {
    mappedHeaders[header.name] = header.value;
  });

  let responseData;
  return new Promise((resolve, reject) => {
    try {
      fetch(detailsUrl, {
        method: 'GET',
        headers: mappedHeaders
      }).then(response => {
        response.json().then(data => {
          resolve(data);
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function tryToGetDetails(data) {
  let msLeft = 5000; // try for 5 sec
  while (!data.details && msLeft > 0) {
    data.details = await getDetails();
    await delay(50);
    msLeft = msLeft - 50;
  }
}

export default async function() {
  if (!location.href.match(/\/rooms(?:\/plus)?\/\d+/i) || hasFeature('disable_hotels_airbnb')) {
    return;
  }
  const data = {};
  await Bluebird.any([tryToGetDetails(data), delay(1500)]);

  let tries = 600; // try for 5 min
  let loaded = isLoaded(data);
  while (!loaded && tries > 0) {
    await delay(500);
    loaded = isLoaded(data);
    tries = tries - 1;
  }
  const debouncedUpdateSearch = _.debounce(() => updateSearch(data), 2000);
  const observer = new MutationObserver(debouncedUpdateSearch);
  const observedEl =
    document.querySelector('#book_it_form') ||
    document.querySelector('[data-plugin-in-point-id="BOOK_IT_SIDEBAR"]');
  observer.observe(observedEl, {childList: true, subtree: true});
  const inputData = getInputData(data);
  return {
    ...inputData,
    props: {
      registerOfferChangeCallback: cb => {
        offerChangeCallback = cb;
      }
    }
  };
}
