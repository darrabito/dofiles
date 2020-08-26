import {updatePreferences} from 'api/preferences';
import {reloadSetting} from 'storage/settings';

export default async data => {
  if (data) {
    const updated = await updatePreferences(data);
    const newSettings = await reloadSetting();
    return {...updated, newSettings};
  }
};
