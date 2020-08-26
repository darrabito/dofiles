import {React} from 'utility/css-ns';
import {WIKIBUY_URL} from 'constants';
import {Component} from 'react';
import _ from 'lodash';
import copyToClip from 'utility/copyToClip';
import sendMetric from 'utility/sendMetric';
import hasFeature from 'utility/hasFeature';
import generateClickId from 'utility/generateClickId';
import formatCurrency from 'utility/formatCurrency';
import './savings-available.less';

class SavingsAvailable extends Component {
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
      savings,
      reward,
      workingCoupons,
      postCoupons,
      isBonkersSavings
    } = this.props;
    const hasReward = reward && reward.amount && !postCoupons;
    return (
      <div className={`savings-wrapper ${reward.categories ? 'has-categories' : ''}`}>
        <div className={`coupon-count ${hasReward ? '' : 'no-reward'}`}>
          {this.props.requiresInput || isBonkersSavings ? (
            <h2>Code Entered</h2>
          ) : (
            <h2>
              <span>
                You saved <span className="palmetto">{savings}</span>
              </span>
            </h2>
          )}
          {workingCoupons.length ? (
            <h6 className="bold center">
              {workingCoupons.length} {workingCoupons.length === 1 ? ' code ' : ' codes '} worked in{' '}
              {runTimeSeconds} sec.
            </h6>
          ) : (
            <h6 className="bold center">
              {couponCount} {couponCount === 1 ? ' code ' : ' best codes '} tested in{' '}
              {runTimeSeconds} sec.
            </h6>
          )}
        </div>

        {this.state.viewCodes ? (
          <div className="view-codes">{this.renderWorkingCodes(workingCoupons)}</div>
        ) : null}
        {hasReward || workingCoupons.length ? (
          <div className="center-content">
            {
              <div
                className={`flex-center savings-breakdown ${hasReward ? 'reward' : ''} ${
                  this.props.hideBorder ? 'hide-border' : ''
                }`}>
                <div className="code-scroll-container">
                  {this.renderWorkingCodes(workingCoupons)}
                </div>
              </div>
            }
            {hasReward && !reward.categories && this.props.requiresInput ? (
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
            ) : null}
          </div>
        ) : null}

        <div className="dismiss-notif">
          {!this.props.demo ? (
            hasReward ? (
              <button
                className="primary-btn-large green"
                onClick={this.props.onClosePopup.bind(this)}>
                Continue to Checkout
              </button>
            ) : (
              <h4 className="primary-link bold" onClick={this.props.onClosePopup.bind(this)}>
                Continue to Checkout
              </h4>
            )
          ) : null}
        </div>
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

  renderWorkingCodes(workingCoupons) {
    return _.map(workingCoupons, (wc, i) => {
      const copied = this.state.copied === wc.code;
      return (
        <div
          onClick={this.onClickCopy.bind(this, wc.code)}
          key={i}
          style={{animationDelay: `${(i + 1) * 50}ms`}}
          className={`coupon-list-item-container ${copied ? 'copied' : ''}`}>
          <h4 className="code midnight bold">
            {copied ? <span className="copied-text">COPIED</span> : wc.code}
            <span className="hidden">{wc.code}</span>
          </h4>
        </div>
      );
    });
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

export default SavingsAvailable;
