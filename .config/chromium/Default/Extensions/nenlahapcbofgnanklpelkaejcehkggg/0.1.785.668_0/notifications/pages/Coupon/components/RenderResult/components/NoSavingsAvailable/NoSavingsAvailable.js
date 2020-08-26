import {React} from 'utility/css-ns';
import {WIKIBUY_URL} from 'constants';
import {Component} from 'react';
import copyToClip from 'utility/copyToClip';
import sendMetric from 'utility/sendMetric';
import hasFeature from 'utility/hasFeature';
import generateClickId from 'utility/generateClickId';
import formatCurrency from 'utility/formatCurrency';
// import {activateThroughPinnedTab} from 'actions/cashbackActions';
import _ from 'lodash';

import GreenCheck from './components/GreenCheck';
import './no-savings-available.less';

class NoSavingsAvailable extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      viewCodes: false
    };
  }

  componentDidMount() {
    if (hasFeature('coup_modal_auto_dismiss')) {
      this.props.autoDismissCenterModal();
    }
  }

  render() {
    const {
      runTimeSeconds,
      couponCount,
      reward,
      codes,
      postCoupons,
      requiresInput,
      vendor
    } = this.props;
    const rewardFound =
      reward && reward.amount && (!postCoupons || !hasFeature('sup_post_cp')) && !reward.categories;
    return (
      <div className="no-savings-wrapper">
        {requiresInput ? (
          <div className="no-savings-header">
            {requiresInput ? (
              <h2>Code Entered</h2>
            ) : !rewardFound ? (
              <h2>You have the best price.</h2>
            ) : null}
            {codes && codes.length ? (
              <div className="view-codes-link-wrapper">
                <h6
                  onClick={
                    rewardFound ? () => this.setState({viewCodes: !this.state.viewCodes}) : null
                  }
                  className={`${rewardFound ? 'clickable' : ''} bold"`}>
                  {this.state.viewCodes ? (
                    <span>hide codes</span>
                  ) : (
                    <span>
                      {couponCount} {couponCount === 1 ? ' code ' : ' best codes '} tested in{' '}
                      {runTimeSeconds} sec.
                    </span>
                  )}
                </h6>
              </div>
            ) : null}
          </div>
        ) : null}

        {this.state.viewCodes && !rewardFound ? (
          <div className="view-codes">
            {_.map(codes, (wc, i) => {
              const copied = this.state.copied === wc.code;
              return (
                <div
                  onClick={this.onClickCopy.bind(this, wc.code)}
                  key={i}
                  style={{animationDelay: `${(i + 1) * 50}ms`}}
                  className={`coupon-list-item-container gray ${copied ? 'copied' : ''}`}>
                  <h4 className="code midnight bold">
                    {copied ? <span className="copied-text">COPIED</span> : wc.code}
                    <span className="hidden">{wc.code}</span>
                  </h4>
                </div>
              );
            })}
          </div>
        ) : null}

        {rewardFound && requiresInput ? (
          <div className="center-content">
            <div className="activation-amount">
              <h3 className="silver">
                <span className="palmetto bold">
                  {reward.type === 'percentage'
                    ? `+${reward.amount / 100}%`
                    : formatCurrency(reward.amount)}
                </span>{' '}
                <span className="antialiased">Wikibuy Credit</span>
              </h3>
              {_.get(this.props, 'exclusions') ? (
                <h6
                  style={{
                    height: '19px',
                    marginTop: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                  Exclusions apply,
                  <span
                    style={{paddingLeft: '3px'}}
                    className="tertiary-link-lighter"
                    onClick={this.onShowExclusion.bind(this)}>
                    {' '}
                    view details.
                  </span>
                </h6>
              ) : null}
            </div>
          </div>
        ) : !reward.categories && requiresInput ? (
          <div className="center-content">
            <h6 className="bold">
              {couponCount} {couponCount === 1 ? ' code ' : ' best codes '} tested in{' '}
              {runTimeSeconds} sec.
            </h6>
          </div>
        ) : (
          <div className="center-column">
            <h2>You have the best price.</h2>
            <div className="best-price-image">
              <GreenCheck />
            </div>
            <p>
              We tried <span>{`${couponCount} ${couponCount === 1 ? 'code' : 'codes'}`}</span> to
              make sure you got the best price, but did not find any additional savings. You can
              check out with confidence that you have Wikibuy's best price at this time.
            </p>
          </div>
        )}
        {!reward.categories && (
          <div className="dismiss-notif">
            {rewardFound && !requiresInput ? (
              <button
                className="primary-btn-large green"
                onClick={this.props.onClosePopup.bind(this)}>
                Continue to Checkout
              </button>
            ) : (
              <h4 className="primary-link bold" onClick={this.props.onClosePopup.bind(this)}>
                Continue to Checkout
              </h4>
            )}
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

  onClickCopy(coupon) {
    const clickId = generateClickId();
    copyToClip(coupon);
    this.setState({copied: coupon}, () => {
      this.timeoutId = setTimeout(() => {
        this.setState({copied: false});
      }, 1000);
    });
    sendMetric('trackClick', 'copyCouponCode', 'code', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname,
      clickId
    });
  }
}

export default NoSavingsAvailable;
