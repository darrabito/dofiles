export default function getArrivalDate() {
  const el = document.querySelector('#delivery-message .a-text-bold') || document.querySelector('#delivery-message > b');
  if (el) {
    return el.innerText;
  }
  return null;
}
