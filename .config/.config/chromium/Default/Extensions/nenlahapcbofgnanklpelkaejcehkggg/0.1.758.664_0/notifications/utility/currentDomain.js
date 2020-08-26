import tld from 'tldjs';

let currentDomain;
if (window.__wbCurrentDomain) {
  currentDomain = window.__wbCurrentDomain;
}
export default () => {
  return currentDomain || tld.getDomain(location.href);
};

export function setDomain(domain) {
  currentDomain = domain;
  window.__wbCurrentDomain = currentDomain;
}
