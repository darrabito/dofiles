import _ from 'lodash';
import $ from 'jquery';
import {WIKIBUY_API} from 'constants';

export default (domain, clickId, channel = 'coupons') => {
  if (/dell\.com\/en-us\/work\/cart/i.test(document.URL)) {
    return `${WIKIBUY_API}/redirect?url=http://dell.com&t=${encodeURIComponent(
      `http://www.dpbolvw.net/click-7882476-10600279?sid=${clickId}`
    )}&clickId=${clickId}&channel=${channel}&r=1`;
  } else if (/cvs\.com\/photo/i.test(document.URL)) {
    return `${WIKIBUY_API}/redirect?url=http://cvs.com&t=${encodeURIComponent(
      `http://www.dpbolvw.net/click-7882476-13016181?url=https%3A%2F%2Fwww.cvs.com%2Fphoto%2Fshop&sid=${clickId}`
    )}&clickId=${clickId}&channel=${channel}&r=1`;
  } else if (
    (/ecomm\.dell\.com/i.test(document.URL) &&
      _.get($('.mNav:contains(Outlet for Home)'), 'length')) ||
    _.get($('.mNav:contains(Outlet for Work)'), 'length')
  ) {
    return `${WIKIBUY_API}/redirect?url=http://dell.com&t=${encodeURIComponent(
      `http://www.anrdoezrs.net/click-7882476-12923553?sid=${clickId}`
    )}&clickId=${clickId}&channel=${channel}&r=1`;
  } else if (domain === 'att.com') {
    if (
      location.pathname.indexOf('/buy/cart') === 0 ||
      location.pathname.indexOf('/buy/checkout') === 0
    ) {
      if (document.querySelector('.DirectvNow__dtv-cart-view')) {
        // ATT TV path, March 2020. This is not the directv path, and we don't want this affiliate link there.
        return `${WIKIBUY_API}/redirect?url=http://att.com&t=${encodeURIComponent(
          `https://www.tkqlhce.com/click-7882476-13958619?sid=${clickId}`
        )}&clickId=${clickId}&channel=cashback&r=1`;
      } else if (document.querySelector('.WirelessCart__wireless-cart-view')) {
        // Wireless path, March 2020
        return `${WIKIBUY_API}/redirect?url=http://att.com&t=${encodeURIComponent(
          `https://www.dpbolvw.net/click-7882476-13650413?sid=${clickId}`
        )}&clickId=${clickId}&channel=cashback&r=1`;
      }
    }
    if (
      location.pathname.indexOf('/shop/wireless/devices/') > -1 ||
      location.pathname.indexOf('/shop/wireless/deviceconfigurator.html') > -1 ||
      location.pathname.indexOf('checkout/onepagecheckout') > -1 ||
      _.get($('.text-legal p:first-child b:contains(Wireless)'), 'length')
    ) {
      // As of March 2020, this link seems to be used rarely, if ever
      return `${WIKIBUY_API}/redirect?url=http://att.com&t=${encodeURIComponent(
        `https://www.tkqlhce.com/click-8789961-13610485?sid=${clickId}`
      )}&clickId=${clickId}&channel=cashback&r=1`;
    } else {
      // This link is the default for everything that isn't TV or wireless
      return `${WIKIBUY_API}/redirect?url=http://att.com&t=${encodeURIComponent(
        `http://www.kqzyfj.com/click-7882476-13489414?sid=${clickId}`
      )}&clickId=${clickId}&channel=cashback&r=1`;
    }
  } else if (domain === 'verizon.com' || domain === 'verizonwireless.com') {
    // Check to see if the "Wireless" nav link is selected
    const vzMainMenu = document.getElementsByClassName('main-menu')[0];
    const selectedLink = vzMainMenu ? vzMainMenu.getElementsByClassName('color_00')[0] : null;
    if (
      _.get(selectedLink, 'href', '').indexOf('verizonwireless.com') > -1 ||
      window.location.pathname.indexOf('onedp') > -1
    ) {
      // If so, use the verizon wireless affiliate link
      return `${WIKIBUY_API}/redirect?url=http://verizonwireless.com&t=${encodeURIComponent(
        `https://www.dpbolvw.net/click-7882476-11365093?sid=${clickId}`
      )}&clickId=${clickId}&channel=cashback&r=1`;
    }
  } else if (/weightwatchers\.com/.test(document.URL)) {
    return `${WIKIBUY_API}/redirect?url=http://weightwatchers.com&t=${encodeURIComponent(
      `http://www.jdoqocy.com/click-7882476-13535195?sid=${clickId}`
    )}&clickId=${clickId}&channel=cashback&r=1`;
  } else if (/gilt\.com\/city/.test(document.URL)) {
    return `${WIKIBUY_API}/redirect?url=http://gilt.com&t=${encodeURIComponent(
      `https://click.linksynergy.com/fs-bin/click?id=3*BIL10dmOI&offerid=539629.3&type=3&subid=0&u1=${clickId}`
    )}&clickId=${clickId}&channel=cashback&r=1`;
  } else if (
    /barkbox\.com/.test(window.location.hostname) &&
    /super-chewer/.test(window.location.pathname)
  ) {
    return `${WIKIBUY_API}/redirect?r=1&url=http://superchewer.com&channel=cashback&clickId=${clickId}`;
  }
};
