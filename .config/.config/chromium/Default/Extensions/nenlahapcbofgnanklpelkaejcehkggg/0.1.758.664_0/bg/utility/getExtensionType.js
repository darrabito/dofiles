import UAParser from 'ua-parser-js';
const uaParser = new UAParser();

const browserMap = {
  'Firefox': 'firefox',
  'Edge': 'edge',
  'Chrome': 'chrome',
  'Safari': 'safari'
}

export default function getExtensionType() {
  const uaResult = uaParser.getResult();
  return browserMap[uaResult.browser.name] || 'Chrome';
}