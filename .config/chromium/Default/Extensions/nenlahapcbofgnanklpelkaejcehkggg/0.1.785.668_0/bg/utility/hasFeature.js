import {includes} from 'lodash';
import tree from 'state';

const HOTELSTORM_DOMAINS = [
  'airbnb.com',
  'booking.com',
  'expedia.com',
  'hotels.com',
  'kayak.com',
  'priceline.com',
  'tripadvisor.com'
];

export function shouldSearchHotelStormHotels(domain) {
  return (
    hasFeature('show_hotel_storm') &&
    (includes(HOTELSTORM_DOMAINS, domain) ||
      (domain === 'google.com' &&
        hasFeature('cug_goog') &&
        hasFeature('wb_hotel_search_on_hs_only')))
  );
}

export function shouldSearchWikibuyHotels(domain) {
  return (
    domain === 'google.com' &&
    hasFeature('show_hotel_storm') &&
    hasFeature('cug_goog') &&
    hasFeature('wb_hotel_search_on')
  );
}

export default function hasFeature(feature) {
  const features = tree.get(['session', 'features']) || [];
  return features.indexOf(feature) > -1;
}
