import {generateAuthToken} from 'api/generateAuthToken';
export default async data => {
  return generateAuthToken(data);
};
