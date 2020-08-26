import _ from 'lodash';

export default async function fetchJSON(url, options = {}) {
  const resp = await fetch(
    url,
    _.merge(
      {
        headers: {
          'Content-Type': 'application/json'
        }
      },
      options
    )
  );
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json);
  }
  return json;
}
