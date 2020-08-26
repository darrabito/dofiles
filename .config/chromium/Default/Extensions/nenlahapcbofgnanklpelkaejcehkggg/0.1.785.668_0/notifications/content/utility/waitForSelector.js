import {exponential} from 'backoff';

export default function waitForSelector(selectorFn, cb) {
  const el = selectorFn();
  if (el) {
    return cb(el);
  }
  const exponentialBackoff = exponential({
    randomisationFactor: 0,
    initialDelay: 50,
    maxDelay: 1500
  });

  exponentialBackoff.backoff();
  exponentialBackoff.on('ready', () => {
    const el = selectorFn();
    if (el) {
      cb(el);
      return;
    } else {
      exponentialBackoff.backoff();
    }
  });
}
