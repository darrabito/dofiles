import {signIn} from 'api/signIn';
export default async data => {
  return signIn(data);
};
