import {find, get, intersection, map} from 'lodash';
import street from 'utility/street';

export function simpleWords(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
}

export function scoreWords(w1, w2) {
  const minLength = Math.min(w1.join('').length, w2.join('').length);
  const length = intersection(w1, w2).join('').length;
  return length / minLength;
}

export function scoreAddress(address1, address2) {
  const addressVariations = street(address1);
  addressVariations.push(address1);
  return !!find(addressVariations, address => {
    return !!address2.match(address);
  });
}

export function scoreResults(results, input) {
  const inputTitle = simpleWords(input.title);
  const inputAddress = simpleWords(input.address);

  const {latitude, longitude} = input;

  return map(results, r => {
    const lat = get(r, 'hotel.address.latitude');
    const long = get(r, 'hotel.address.longitude');
    const dx = parseFloat(latitude) - lat;
    const dy = parseFloat(longitude) - long;
    const distance = Math.pow(dx * dx + dy * dy, 0.5);

    const name = simpleWords(r.hotel.name);
    const address = simpleWords(r.hotel.address.line1);
    const nameScore = scoreWords(inputTitle, name);
    const addressScore = scoreWords(inputAddress, address);
    const addressMatch = scoreAddress(address.join(' '), inputAddress.join(' '));
    r.score = {distance, nameScore, addressMatch, addressScore, total: nameScore * addressScore};
    return r;
  });
}
