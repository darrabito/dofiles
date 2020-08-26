import hasFeature from 'utility/hasFeature';

export function getPlatform() {
  if (hasFeature('mag_coup_on') && document.URL.includes('/checkout/')) {
    const magentoInputEl = document.querySelector(
      '#coupon_code, .checkout-container, .discount-form .input-box'
    ); // cart, checkout, ar500armor.com cart – #discount-code isn't on the page at load in checkout
    if (
      magentoInputEl &&
      (document.querySelector('#discount-coupon-form') ||
        document.documentElement.outerHTML.match(/magento/i)) // almost universal
    ) {
      return 'Magento';
    }
  }
  if (
    hasFeature('woo_coup_on') &&
    (document.URL.includes('/checkout/') || document.URL.includes('/cart/')) &&
    document.querySelector('[class*=woocommerce]')
  ) {
    if (document.querySelector('#coupon_code') || document.querySelector('[class*=promo_code]')) {
      return 'WooCommerce';
    }
  }
}
