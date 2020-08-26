import _ from 'lodash';

export default function checkNordstromGuestCheckoutClickNeeded() {
  if (
    localStorage.getItem('__wb_redirecting') &&
    window.location.hostname.match(/secure|www\.nordstrom\.com/) &&
    window.location.pathname.match(/checkout\/sign-in/)
  ) {
    let clicked = false;

    const nordstromInterval = setInterval(() => {
      const guestCheckoutButton = _.find(document.querySelectorAll('div button'), el =>
        el.textContent.match(/guest checkout/i)
      );
      if (guestCheckoutButton && !clicked) {
        clicked = true;
        guestCheckoutButton.click();
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(nordstromInterval);
    }, 10000);
  }
}