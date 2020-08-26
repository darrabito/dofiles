import findHotel, {searchBetweenTwoPoints, findMultple} from 'logic/hotelstorm';
import findWikibuyHotel from 'logic/wikibuyHotels';
import {shouldSearchWikibuyHotels} from 'utility/hasFeature';

export default async data => {
  if (data.price === -1) {
    // Bail out if there aren't any offers
    return;
  }
  if (shouldSearchWikibuyHotels(data.domain)) {
    return findWikibuyHotel(data);
  }
  if (!data.latitude || !data.longitude) {
    // Bail out if the latitude/longitude could not be found
    return;
  }
  if (data.type === 'searchBetweenTwoPoints') {
    searchBetweenTwoPoints(data);
    return;
  }
  if (data.type === 'findMultiple' && data.hotels && data.hotels.length) {
    return findMultple(data.hotels, data.meta);
  }
  return findHotel(data);
};
