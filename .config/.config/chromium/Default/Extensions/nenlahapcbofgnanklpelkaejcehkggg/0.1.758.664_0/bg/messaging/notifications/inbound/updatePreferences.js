import {updatePreferences} from 'api/preferences';
import {reloadSetting} from 'storage/settings';

export default async (data) => {
  if (data) {
    return updatePreferences(data).then((data) => {
      reloadSetting();
      return data;
    });
  }
};
