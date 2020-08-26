import xhr from 'utility/xhr';
import {WIKIBUY_API} from 'constants';

export async function generateAuthToken() {
  return await xhr('GET', `${WIKIBUY_API}/generate_token`);
}
