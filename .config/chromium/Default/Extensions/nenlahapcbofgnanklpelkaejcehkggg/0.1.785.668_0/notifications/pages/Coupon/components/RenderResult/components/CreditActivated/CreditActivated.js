import {React} from 'utility/css-ns';
import _ from 'lodash';
import {WIKIBUY_URL} from 'constants';
import sendMetric from 'utility/sendMetric';
import formatCurrency from 'utility/formatCurrency';
import getExpectedPayoutDate from 'utility/getExpectedPayoutDate';
import hasFeature from 'utility/hasFeature';

import './credit-activated.less';

class CreditActivated extends React.Component {
  constructor(...args) {
    super(...args);
  }

  componentDidMount() {
    if (hasFeature('coup_modal_auto_dismiss')) {
      if (this.props.autoDismissCenterModal) {
        // CreditActivated mounts in addition to SavingsAvailable or NoSavingsAvailable in auto fallback
        // don't pass in autoDismissCenterModal for autoFallback because it will break the cancel function
        this.props.autoDismissCenterModal();
      }
    }
  }
  render() {
    const {
      noSavingsAvailable,
      reward,
      payoutProcessingPeriod,
      showDismiss,
      vendor,
      couponCount
    } = this.props;
    return (
      <div className="credit-activated-wrapper">
        <h2>
          {reward.categories ? 'Up to ' : ''}
          <span className="palmetto">
            {reward.type === 'percentage'
              ? `${reward.amount / 100}%`
              : formatCurrency(reward.amount)}
          </span>
          {' in Wikibuy Credit is activated!'}
        </h2>
        {_.get(this.props, 'exclusions') ? (
          <h6>
            Exclusions apply,
            <span className="tertiary-link-lighter" onClick={this.onShowExclusion.bind(this)}>
              {' '}
              view details.
            </span>
          </h6>
        ) : null}
        <p>
          {noSavingsAvailable ? (
            <React.Fragment>
              We tried{' '}
              <span>
                {couponCount} {couponCount === 1 ? 'code' : 'codes'}
              </span>
              , but did not find any additional savings. You can check out with confidence that you
              have Wikibuy's best price at this time with {reward.categories ? 'up to ' : ''}
              <span className="palmetto">
                {reward.type === 'percentage'
                  ? `${reward.amount / 100}%`
                  : formatCurrency(reward.amount)}
                {' Credit back '}
              </span>
              on your purchases.
              <br />
              <br />
              Complete your purchases to receive your Credit. You can redeem Wikibuy Credit for gift
              cards from top merchants.
            </React.Fragment>
          ) : (
            <React.Fragment>
              Complete your purchase to receive your Credit by{' '}
              <span>{getExpectedPayoutDate(payoutProcessingPeriod)}</span>. <br />
              <br />
              We'll email you when your Credit is ready to redeem for gift cards from top merchants.
            </React.Fragment>
          )}
        </p>
        {showDismiss && (
          <div className="dismiss-notif">
            <button className="primary-btn-large" onClick={this.props.onClosePopup.bind(this)}>
              Continue to Checkout
            </button>
          </div>
        )}
      </div>
    );
  }

  onShowExclusion() {
    sendMetric('trackClick', 'viewExclusionDetails', 'view details', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
    window.open(`${WIKIBUY_URL}/s/${this.props.tld}/coupon`, '_blank');
  }
}

export default CreditActivated;
