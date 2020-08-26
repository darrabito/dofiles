import xhr from 'utility/xhr';
import {WIKIBUY_API} from 'constants';
import {refreshSession} from 'logic/account';

export async function signIn(data) {
  const session = await xhr('POST', `${WIKIBUY_API}/session`, data);
  if (_.get(session, 'data')) {
    refreshSession({session: session.data});
  }
  return session;
}
