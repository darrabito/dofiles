/* global browser */
export default async function getFirefoxTrackingValue() {
  const storageResult = await browser.storage.local.get('trackingEnabled');
  const currentTrackingValue = storageResult.trackingEnabled;
  return currentTrackingValue;
}
