import xhr from 'utility/xhr';
import {WIKIBUY_API} from 'constants';
import {refreshSession} from 'logic/account';

export async function createAccount(data) {
  const account = await xhr('POST', `${WIKIBUY_API}/account`, data);
  if (!_.get(account, 'error')) {
    refreshSession();
  }
  return account;
}
