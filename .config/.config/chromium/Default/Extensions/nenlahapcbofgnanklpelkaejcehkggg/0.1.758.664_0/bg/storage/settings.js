import _ from 'lodash';
import localStore from './local';
import getPreferences, {clear} from '../cache/preferencesCache';
import {updatePreferences} from 'api/preferences';
import {track} from 'utility/analytics';
import tree from 'state';

export async function reloadSetting() {
  clear();
  const settings = await loadSettings();
  tree.set('settings', settings);
  return settings;
}

function getPrimeMembership(prefs, defaultValue = true) {
  const primeMembership = _.find(_.get(prefs, 'memberships'), ({type}) => {
    return type === 'amazonPrime';
  });
  return _.get(primeMembership, 'active', defaultValue);
}

async function updateZipAndPrime(zipcode, prime, currentPrefs) {
  const memberships = _.map(currentPrefs.memberships, membership => {
    if (membership.type === 'amazonPrime') {
      return {
        type: 'amazonPrime',
        active: !!prime
      };
    }
    return membership;
  });
  if (!memberships.length) {
    memberships.push({
      type: 'amazonPrime',
      active: !!prime
    });
  }
  return await updatePreferences({
    customer: {
      zipcode
    },
    memberships
  });
}

export async function saveSettings(settings) {
  const {prime, zipcode: zipFromSettings} = settings;
  await localStore.set({userPrefs: settings});
  const prefs = await getPreferences();
  // Update prefs if prime or zipcode has changed
  const zipFromPrefs = _.get(prefs, 'customer.zipcode');
  const zipcodeChanged = zipFromPrefs !== zipFromSettings;
  const primeMembershipChanged = getPrimeMembership(prefs) !== settings.prime;
  if (
    prefs &&
    typeof prefs === 'object' &&
    !prefs.error &&
    (zipcodeChanged || primeMembershipChanged)
  ) {
    // keeping track of where we got the zipcode we are using for update
    if (zipcodeChanged) {
      const zipcodeSettingsInfo = tree.get('zipcodeSettings');
      track('settingsZipcodeUpdate', {zipFromPrefs, zipFromSettings, ...zipcodeSettingsInfo});
    }

    await updateZipAndPrime(zipFromSettings, prime, prefs);
    await reloadSetting();
  }
}

const DEFAULT_PREFS = {
  showOnboarding: true,
  showWebsiteOnboarding: true,
  zipcode: '78756',
  prime: false,
  dismissNewTabSites: false
};

export async function loadSettings() {
  let prefs;
  let serverPrefs;
  let serverPrefsError = false;
  let zipcodeFromServerPrefs;

  // check local store for prefs
  const {userPrefs: userPrefsFromLocalStore, isShadowAccount} = await localStore.get();
  if (userPrefsFromLocalStore) {
    prefs = userPrefsFromLocalStore;
    tree.set(['zipcodeSettings', 'zipcodeSource'], 'localStore');
  } else {
    prefs = _.cloneDeep(DEFAULT_PREFS);
    tree.set(['zipcodeSettings', 'zipcodeSource'], 'default');
  }

  try {
    // get prefs from cache or api
    serverPrefs = await getPreferences();
    if (isShadowAccount && _.get(serverPrefs, 'customer', 'zipcode') === '78756') {
      // prevent overriding prefs
      prefs.hasAccount = true;
      prefs.events = _.get(serverPrefs, 'events', {});
    } else if (serverPrefs && !serverPrefs.error) {
      zipcodeFromServerPrefs = _.get(serverPrefs, 'customer.zipcode');
      if (zipcodeFromServerPrefs) {
        prefs.zipcode = zipcodeFromServerPrefs;
        tree.set(['zipcodeSettings', 'zipcodeSource'], 'serverPrefs');
      }
      prefs.firstname = _.get(serverPrefs, 'customer.firstname', prefs.firstname);
      prefs.lastname = _.get(serverPrefs, 'customer.lastname', prefs.lastname);
      prefs.prime = getPrimeMembership(serverPrefs, prefs.prime);
      prefs.hasAccount = true; // Shows just the last step of onboarding if applicable
      prefs.events = _.get(serverPrefs, 'events', {});
    } else if (serverPrefs && serverPrefs.error) {
      serverPrefsError = true;
    }

    // if local prefs don't equal serverPrefs
    let finalZipcode = zipcodeFromServerPrefs;
    if (!finalZipcode) {
      finalZipcode = '78756';
    }
    if (!/^\d{5}$/.test(prefs.zipcode) || prefs.zipcode !== finalZipcode) {
      prefs.zipcode = finalZipcode;
      tree.set(['zipcodeSettings', 'zipcodeSource'], 'fallback');
    }

    // override with serverPrefs
    if (typeof prefs.prime !== 'boolean') {
      prefs.prime = true;
    }
    if (serverPrefs && serverPrefs.dismissNewTabSites) {
      prefs.dismissNewTabSites = serverPrefs.dismissNewTabSites;
    }
    if (serverPrefs && serverPrefs.username) {
      prefs.username = serverPrefs.username;
    }
    if (serverPrefs && serverPrefs.notificationPreferences) {
      prefs.notificationPreferences = serverPrefs.notificationPreferences;
    }
    if (serverPrefs && serverPrefs.emailPreferences) {
      prefs.emailPreferences = serverPrefs.emailPreferences;
    }
  } catch (e) {
    tree.set(['zipcodeSettings', 'error'], e.message);
  }
  tree.set(
    ['zipcodeSettings', 'details'],
    `userPrefsFromLocalStore: ${!!userPrefsFromLocalStore}, serverPrefs: ${!!serverPrefs}, serverPrefsError: ${serverPrefsError} isShadowAccount: ${isShadowAccount}, zipcodeFromServerPrefs: ${zipcodeFromServerPrefs}`
  );

  return prefs;
}

const debounceSaveSettings = _.debounce(() => {
  saveSettings(tree.get('settings'));
}, 1000);
// Save settings when they update
tree.select('settings').on('update', debounceSaveSettings);
