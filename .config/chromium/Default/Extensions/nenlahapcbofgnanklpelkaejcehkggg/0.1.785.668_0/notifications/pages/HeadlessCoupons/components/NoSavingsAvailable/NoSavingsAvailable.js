import {React} from 'utility/css-ns';
import {WIKIBUY_URL} from 'constants';
import {Component} from 'react';
import copyToClip from 'utility/copyToClip';
import sendMetric from 'utility/sendMetric';
import formatCurrency from 'utility/formatCurrency';
import {dropCookie, throttleNotification} from 'actions/headlessCouponsActions';
import _ from 'lodash';
import generateClickId from 'utility/generateClickId';
import './no-savings-available.less';

class NoSavingsAvailable extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      viewCodes: false
    };
    this.onCtaClick = this.onCtaClick.bind(this);
  }

  render() {
    const {couponCount, reward, codes, runFinshedAtCheckout, ctaText} = this.props;
    const rewardFound = false;
    return (
      <div className="no-savings-wrapper">
        <div className="no-savings-header">
          <h2>No savings available.</h2>
          {codes && codes.length ? (
            <div className="view-codes-link-wrapper">
              <h6
                onClick={
                  rewardFound ? () => this.setState({viewCodes: !this.state.viewCodes}) : null
                }
                className={`${rewardFound ? 'clickable' : ''} bold"`}>
                <span>
                  Wikibuy tested {couponCount} {couponCount === 1 ? ' code.' : ' codes.'}
                </span>
              </h6>
            </div>
          ) : null}
        </div>

        {this.state.viewCodes || !rewardFound ? (
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

        {rewardFound ? (
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
          </div>
        ) : null}
        <div className="dismiss-notif">
          {runFinshedAtCheckout ? (
            <div>
              <button className="primary-btn-large" onClick={this.onCtaClick}>
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
              <button className="primary-btn-large" onClick={this.onCtaClick}>
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

  onCtaClick() {
    const clickId = generateClickId();
    // sendMetric('track', 'dropCookieNoSavingsRoboCoup', {
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
  }

  // onReloadNoDropCookie() {
  //   sendMetric('track', 'cancelSavingsClickRoboCoup', {
  //     domain: location.hostname.replace(/^www\./, ''),
  //     pagePath: location.pathname,
  //     savings: this.props.savings
  //   });
  //   throttleNotification();
  //   setTimeout(() => window.location.reload(), 1000);
  //   this.props.onClosePopup();
  // }

  // onCancel() {
  //   sendMetric('track', 'cancelSavingsClickRoboCoup', {
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

export default NoSavingsAvailable;
