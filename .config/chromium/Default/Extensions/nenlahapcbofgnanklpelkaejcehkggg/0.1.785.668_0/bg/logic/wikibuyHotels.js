import {cloneDeep, get, isEmpty} from 'lodash';
import LRU from 'lru-cache';
import queryString from 'querystring';
import {track} from 'utility/analytics';
import hasFeature from 'utility/hasFeature';
import {scoreWords, simpleWords} from 'utility/hotelMatching';
import xhr from 'utility/xhr';
import {WIKIBUY_HOTELS_API, WIKIBUY_HOTELS_URL} from '../constants';

const cache = LRU({
  max: 15,
  maxAge: 1000 * 60 * 60 * 1 // 1 hour
});

function getCacheKey(searchParams) {
  return btoa(JSON.stringify(searchParams));
}

/**
 * Convert a MM/DD/YYYY string to YYYY-MM-DD
 */
function formatDate(date) {
  const parts = date.split('/');
  const year = parts.pop();
  parts.unshift(year);
  return parts.join('-');
}

function getDetailsParams(input, camelCase = false) {
  const {checkIn, checkOut, guests, rooms} = input;

  return {
    [camelCase ? 'checkIn' : 'check-in']: checkIn,
    [camelCase ? 'checkOut' : 'check-out']: checkOut,
    guests,
    rooms
  };
}

function getSearchParams(input, camelCase = false) {
  const {latitude, location, longitude} = input;

  const searchParams = getDetailsParams(input, camelCase);

  if (latitude && longitude) {
    searchParams.latitude = latitude;
    searchParams.longitude = longitude;
  } else {
    searchParams.location = location;
  }

  if (hasFeature('show_hotel_storm')) {
    searchParams.hs = true;
  }

  return searchParams;
}

function getDetailsUrl(hotelId, detailsParams) {
  return `${WIKIBUY_HOTELS_URL}/${hotelId}?${queryString.stringify(detailsParams)}`;
}

function getSearchUrl(searchParams) {
  return `${WIKIBUY_HOTELS_API}/search?${queryString.stringify(searchParams)}`;
}

async function searchHotels(input) {
  const searchParams = getSearchParams(input);
  const cacheKey = getCacheKey(searchParams);
  const cachedResponse = cache.get(cacheKey);

  if (cachedResponse) {
    return cachedResponse.hotels;
  }

  const searchUrl = getSearchUrl(searchParams);

  let response;

  try {
    response = await xhr('GET', searchUrl);
  } catch (error) {
    track('wbHotelSearchError', {
      ...input,
      error: error ? error : undefined
    });
  }

  if (!response) return;

  if (!isEmpty(response.hotels)) {
    // Sort hotels by distance
    response.hotels.sort(
      (hotelA, hotelB) => hotelA.distance.kilometers - hotelB.distance.kilometers
    );

    cache.set(cacheKey, response);

    return response.hotels;
  } else if (response.error) {
    track('wbHotelSearchError', {
      ...input,
      error: response.error
    });
  }
}

async function findWikibuyHotel(pageInput) {
  const {adults, searchId, title, ...input} = pageInput;
  input.location = title;
  input.checkIn = formatDate(input.checkIn);
  input.checkOut = formatDate(input.checkOut);
  input.guests = adults;

  const hotels = await searchHotels(input);

  if (isEmpty(hotels)) return;

  const hotel = hotels[0]; // Use the closest hotel

  const nameScore = scoreWords(simpleWords(title), simpleWords(hotel.name));

  // If we're not confident enough that the names match the same hotel, do not display the notification
  if (nameScore < 0.75) {
    track('wbHotelSearchNoMatch', {
      ...input,
      hotelName: hotel.name,
      nameScore
    });

    return;
  }

  // Sort offers by price
  hotel.offers.sort(
    (offer1, offer2) => offer1.pricing.pricePostDiscount - offer2.pricing.pricePostDiscount
  );

  const averageNightlyPrice = Math.round(get(hotel, 'offers[0].pricing.averageNightlyPrice')) * 100;
  const discount = input.price - averageNightlyPrice;
  const reward = get(hotel, 'offers[0].pricing.discount');

  track('wbHotelSearchMatch', {
    ...input,
    averageNightlyPrice,
    cashback: {reward},
    discount,
    hotelName: hotel.name,
    nameScore
  });

  if (averageNightlyPrice > input.price) return;

  const detailsParams = getDetailsParams(input);
  const hotelUrl = getDetailsUrl(hotel.id, detailsParams);
  const viewData = {
    title: hotel.name,
    url: hotelUrl,
    discount,
    cashback: {reward},
    wikibuyHotel: hotel,
    searchParams: getSearchParams(input, true)
  };

  return viewData;
}

export default findWikibuyHotel;
