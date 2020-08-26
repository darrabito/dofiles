import tree from 'state';
import getZipcode from 'messenger/outbound/getZipcode';
import getUser from 'messenger/outbound/getUser';
import _ from 'lodash';
import apiErrorParser from 'utility/apiErrorParser';
import sendMetric from 'utility/sendMetric';
import updatePreferences from 'messenger/outbound/updatePreferences';
import updatePreferencesAndGetNew from 'messenger/outbound/updatePreferencesAndGetNew';
import createWikibuyAccount from 'messenger/outbound/createWikibuyAccount';
import signIntoWikibuyAccount from 'messenger/outbound/signIntoWikibuyAccount';
import generateAuthToken from 'messenger/outbound/generateAuthToken';
import Promise from 'bluebird';
let globalAccountToken;
let tokenLoading;
let tokenPromise;

export async function fetchAuthToken() {
  try {
    globalAccountToken = null;
    tokenLoading = true;
    tokenPromise = setTokenPromise();
    const token = await tokenPromise;
    tokenLoading = false;
    globalAccountToken = token.token;
    return token.token;
  } catch (err) {
    tokenLoading = false;
    return null;
  }
}

async function setTokenPromise() {
  const token = await generateAuthToken();
  await Promise.delay(token.ttw);
  return token;
}

function getToken() {
  return new Promise(async (resolve, reject) => {
    let t;
    if (globalAccountToken) {
      resolve(globalAccountToken);
      globalAccountToken = null;
      tokenPromise = null;
      return;
    } else if (tokenLoading && tokenPromise) {
      t = await tokenPromise;
    } else {
      t = await fetchAuthToken();
    }
    if (t && t.token) {
      resolve(t.token);
    } else {
      reject(t);
    }
  });
}

export async function fetchZipcode(zip) {
  try {
    const zipcode = await getZipcode({zipcode: zip});
    return zipcode;
  } catch (err) {
    return null;
  }
}

export async function createAccount(accountData) {
  try {
    const accountToken = await getToken();
    let account = await createWikibuyAccount({loginToken: accountToken, ...accountData});
    if (_.get(account, 'error')) {
      throw new Error(account.error);
    }
    return account;
  } catch (err) {
    await fetchAuthToken();
    return {error: getErrorMessage(err.message, 'createAccount')};
  }
}

export async function signIn(accountData) {
  try {
    const accountToken = await getToken();
    let account = await signIntoWikibuyAccount({loginToken: accountToken, ...accountData});
    if (_.get(account, 'error')) {
      throw new Error(account.error);
    }
    return account;
  } catch (err) {
    await fetchAuthToken();
    return {error: getErrorMessage(err.message, 'signin')};
  }
}

export async function addName({firstname, lastname}) {
  try {
    let account = await updatePreferences({customer: {firstname, lastname}});
    if (account && account.error) {
      return {error: account.error};
    }
    return {success: account};
  } catch (err) {
    const error = apiErrorParser(err);
    return {error: error || 'There was an error'};
  }
}

export async function updateAutomaticCoupons({notificationPreferences}) {
  try {
    let account = await updatePreferencesAndGetNew({notificationPreferences}, true);
    if (account && account.error) {
      return {error: account.error};
    }
    tree.set('settings', _.get(account, 'newSettings'));
    return {success: account};
  } catch (err) {
    const error = apiErrorParser(err);
    return {error: error || 'There was an error'};
  }
}

function getErrorMessage(error, type) {
  const emailError = error === 'Email already in use';
  const accountNotFound = error === 'Account not found';
  const invalidCredentials = error === 'Invalid credentials';
  if (emailError) {
    error = 'There is an existing account associated with your email.';
    sendMetric('trackError', 'createAccountExtError', 'accountAlreadyExists');
  } else if (invalidCredentials) {
    sendMetric('trackError', 'signInError', 'invalidCredentials');
  } else if (accountNotFound) {
    sendMetric('trackError', 'signInError', 'accountNotFound');
  } else {
    if (type === 'signin') {
      error = error || 'There was an error logging into your account. Please try again.';
      //sendMetric('trackError', 'createAccountExtError', 'miscError');
    } else {
      error = error || 'There was an error creating your account. Please try again.';
      sendMetric('trackError', 'createAccountExtError', 'miscError');
    }
  }
  return error;
}
