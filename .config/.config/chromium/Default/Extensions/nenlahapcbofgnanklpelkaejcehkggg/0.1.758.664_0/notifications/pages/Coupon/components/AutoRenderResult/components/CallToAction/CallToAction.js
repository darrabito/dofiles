import {React} from 'utility/css-ns';
import {Component} from 'react';
import './call-to-action.less';
import hasFeature from 'utility/hasFeature';
import isFullAccount from 'utility/isFullAccount';

class CallToAction extends Component {
  render() {
    const {running, result, couponCount, savings, loading, roo} = this.props;
    const showSubscribe = hasFeature('coupon_email_subscription') && isFullAccount() && !roo;
    const buttonPulse = hasFeature('ext_cnc_btn_pulse');
    return (
      <div
        id="try-codes-button"
        className={`button-wrapper coupons-cta ${showSubscribe ? 'subscribe' : ''}`}>
        {loading ? (
          <div className="loader-container">
            <span>
              <h3>Loading...</h3>
            </span>
          </div>
        ) : !running && !result ? (
          <button
            className={`primary-btn-large ${buttonPulse ? 'button-pulse' : ''}`}
            disabled={running}
            onClick={this.props.onTryCodes.bind(this, false)}>
            Try {couponCount === 1 ? 'Code' : 'Codes'}
          </button>
        ) : !savings ? (
          <button
            className="tertiary-btn-large round icon-x icon"
            onClick={this.props.onClosePopup.bind(this, 'close')}
          />
        ) : null}
      </div>
    );
  }
}

export default CallToAction;
