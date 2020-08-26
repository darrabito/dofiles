import _ from 'lodash';
import {React} from 'utility/css-ns';
import currentDomain from 'utility/currentDomain';
import {onChooseCouponPref} from 'actions/couponActions';
import './automatic-coupon-settings.less';

class AutomaticCouponSettings extends React.Component {
  constructor(...args) {
    super(...args);
  }

  render() {
    const isAmazon = currentDomain() === 'amazon.com';
    const automaticCouponsEnabled =
      _.get(this, 'props.settings.notificationPreferences.automaticCouponsEnabled') !== false;
    const amazonAutomaticCouponsEnabled =
      _.get(this, 'props.settings.notificationPreferences.amazonAutomaticCouponsEnabled') !== false;
    const {onClose} = this.props;
    return (
      <div className={`automatic-coupon-settings ${isAmazon ? ' amazon' : ''}`}>
        <div className="automatic-coupon-settings-wrapper">
          <h2 className="bold charcoal">Test the best coupons for me...</h2>
          <div>
            <section
              className="checkbox-group"
              onClick={onChooseCouponPref.bind(
                this,
                true,
                isAmazon ? 'Amazon is automatic at checkout (default)' : 'Automatic at checkout (default)'
              )}>
              <input
                onChange={() => {}}
                type="radio"
                id="automatic"
                name="automatic"
                checked={isAmazon ? amazonAutomaticCouponsEnabled : automaticCouponsEnabled}
              />
              <label className="large" htmlFor="automatic">
                <h3>
                  automatically at checkout. <span className="gray">(default)</span>
                </h3>
              </label>
            </section>
            <section
              className="checkbox-group"
              onClick={onChooseCouponPref.bind(this, false, isAmazon ? 'Click at checkout on Amazon' : 'Click at checkout')}>
              <input
                onChange={() => {}}
                type="radio"
                id="click"
                name="click"
                checked={isAmazon ? !amazonAutomaticCouponsEnabled : !automaticCouponsEnabled}
              />
              <label className="large" htmlFor="click">
                <h3>only when I click "Try Codes."</h3>
              </label>
            </section>
          </div>
          <h4 className="back-button" onClick={onClose}>
            Back
          </h4>
        </div>
      </div>
    );
  }
}

export default AutomaticCouponSettings;
