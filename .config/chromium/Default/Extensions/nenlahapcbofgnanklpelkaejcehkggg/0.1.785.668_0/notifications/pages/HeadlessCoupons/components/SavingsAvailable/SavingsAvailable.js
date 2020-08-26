import {React} from 'utility/css-ns';
import {WIKIBUY_URL} from 'constants';
import {Component} from 'react';
import copyToClip from 'utility/copyToClip';
import sendMetric from 'utility/sendMetric';
import currency from 'utility/currency';
import formatCurrency from 'utility/formatCurrency';
import _ from 'lodash';
import {dropCookie, throttleNotification} from 'actions/headlessCouponsActions';
import uuid from 'uuid';
import './savings-available.less';

class SavingsAvailable extends Component {
  state = {
    viewCodes: false
  };
  render() {
    const {
      workingCoupons,
      savings,
      couponCount,
      runFinshedAtCheckout,
      ctaText,
      reward
    } = this.props;
    const hasReward = false;
    return (
      <div className="savings-wrapper">
        <div className={`coupon-count ${hasReward ? '' : 'no-reward'}`}>
          <h2>
            <span>
              Savings applied!
              <br />
              <span className="palmetto">{currency(savings)}</span>
            </span>
          </h2>
          <h6 className="bold center">
            Wikibuy tested {couponCount} {couponCount === 1 ? ' code ' : ' codes '}
          </h6>
        </div>
        {hasReward || workingCoupons.length ? (
          <div className="center-content">
            <div className={`flex-center savings-breakdown ${hasReward ? 'reward' : ''}`}>
              <div className="code-scroll-container">{this.renderWorkingCodes(workingCoupons)}</div>
            </div>
            {hasReward ? (
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
                    *Exclusions apply,
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
          {runFinshedAtCheckout ? (
            <div>
              <button className="primary-btn-large" onClick={this.onDropCookieAndReload.bind(this)}>
                {ctaText}
              </button>
              {/*
              <h6 className="text-link">
                <span onClick={this.onReloadNoDropCookie.bind(this)}>Cancel</span>
              </h6>
            */}
            </div>
          ) : (
            <div>
              <button className="primary-btn-large" onClick={this.onDropCookieAndReload.bind(this)}>
                {ctaText}
              </button>
              {/*
              <h6 className="text-link">
                <span onClick={this.onCancel.bind(this)}>Cancel</span>
              </h6>
            */}
            </div>
          )}
        </div>
      </div>
    );
  }

  // onDropCookie() {
  //   const clickId = uuid.v4().replace(/-/g, '');
  //   sendMetric('track', 'applySavingsRoboCoup', {
  //     domain: location.hostname.replace(/^www\./, ''),
  //     clickId,
  //     pagePath: location.pathname,
  //     savings: this.props.savings
  //   });
  //   dropCookie(clickId);
  //   throttleNotification();
  //   this.props.onClosePopup();
  // }

  onDropCookieAndReload() {
    const clickId = uuid.v4().replace(/-/g, '');
    // sendMetric('track', 'applySavingsRoboCoup', {
    //   domain: location.hostname.replace(/^www\./, ''),
    //   clickId,
    //   pagePath: location.pathname,
    //   savings: this.props.savings
    // });
    this.props.ctaClickLogger(this.props.ctaText);
    if (!this.props.disableAffiliate) {
      dropCookie(clickId);
    }
    throttleNotification();
    this.props.onClosePopup();
    setTimeout(() => window.location.reload(), 1000);
  }

  // onReloadNoDropCookie() {
  //   sendMetric('track', 'cancelSavingsRoboCoup', {
  //     domain: location.hostname.replace(/^www\./, ''),
  //     pagePath: location.pathname,
  //     savings: this.props.savings
  //   });
  //   throttleNotification();
  //   setTimeout(() => window.location.reload(), 1000);
  //   this.props.onClosePopup();
  // }

  // onCancel() {
  //   sendMetric('track', 'cancelSavingsRoboCoup', {
  //     domain: location.hostname.replace(/^www\./, ''),
  //     pagePath: location.pathname,
  //     savings: this.props.savings
  //   });
  //   throttleNotification();
  //   this.props.onClosePopup();
  // }

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
    copyToClip(coupon);
    this.setState({copied: coupon}, () => {
      this.timeoutId = setTimeout(() => {
        this.setState({copied: false});
      }, 1000);
    });
    sendMetric('trackClick', 'copyCouponCode', 'code', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
  }
}

export default SavingsAvailable;
