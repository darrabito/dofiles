import {WIKIBUY_API} from 'constants';
import {pickBy} from 'lodash';
import queryString from 'querystring';
import tree from 'state';
import dashUuid from './dashUuid';

const VALID_PARAMS = [
  'autoRedirect',
  'channel',
  'clickEvent',
  'credits',
  'destUrl',
  'redirectId',
  'subExperience',
  'userId',
  'vendorMetaId',
  'wbPublisher'
];

const DEFAULT_PARAMS = {
  autoRedirect: true,
  credits: false,
  experience: 'extension'
};

export default function generateAffiliateUrl({params = {}, isWbPublisher = false} = {}) {
  const defaultParams = {...DEFAULT_PARAMS}; // Copy the defaults to not alter their original state

  if (isWbPublisher) {
    defaultParams.channel = 'cashback-ims';
    defaultParams.userId = tree.get(['session', 'id']);
    defaultParams.wbPublisher = 'wb';
  }

  if (params.vendorMetaId) {
    defaultParams.credits = true;
  }

  const validParams = {
    ...defaultParams,
    ...pickBy(
      params,
      (value, key) => value !== null && value !== undefined && VALID_PARAMS.includes(key)
    )
  };

  if (validParams.redirectId) {
    // Ensure the 'redirectId' has dashes (in cases where 'clickId' is passed in as 'redirectId')
    validParams.redirectId = dashUuid(validParams.redirectId);
  }

  return `${WIKIBUY_API}/redirectV2?${queryString.stringify(validParams)}`;
}
