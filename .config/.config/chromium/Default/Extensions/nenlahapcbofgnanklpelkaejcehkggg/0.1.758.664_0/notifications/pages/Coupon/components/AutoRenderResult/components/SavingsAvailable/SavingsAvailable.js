import PartnerLogo from 'components/PartnerLogo';
import {React} from 'utility/css-ns';
import {WIKIBUY_URL} from 'constants';
import {Component} from 'react';
import sendMetric from 'utility/sendMetric';
import currentDomain from 'utility/currentDomain';
import _ from 'lodash';
import './savings-available.less';
import {determineAndDropCookieAutoCoup} from 'actions/couponActions';
import generateClickId from 'utility/generateClickId';
import dashUuid from 'common/utility/dashUuid';
import formatCurrency from 'utility/formatCurrency';

let selfDismiss;

class SavingsAvailable extends Component {
  constructor(...args) {
    super(...args);
    this.onShowExclusion = this.onShowExclusion.bind(this);
  }

  componentDidMount() {
    if (currentDomain() === 'amazon.com' && !this.props.autoCouponSettings) {
      selfDismiss = setTimeout(() => this.props.onClosePopup(), 5000);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.autoCouponSettings !== prevProps.autoCouponSettings) {
      window.clearTimeout(selfDismiss);
    }
  }

  sendCtaEvent({ctaText, clickId} = {}) {
    const redirectId = dashUuid(clickId);
    sendMetric('track', 'couponsModalClickCta', {
      domain: this.props.domain,
      pagePath: location.pathname,
      coupons: this.props.couponsFromResult,
      savings: this.props.rawSavings,
      bestCoupon: this.props.bestCode,
      cashback: this.props.isCashback,
      triggerType: 'auto',
      ctaText,
      runDuration: _.get(this, 'props.runDuration'),
      clickId,
      redirectId,
      couponRunId: null
    });
  }

  onShowExclusion() {
    sendMetric('trackClick', 'viewExclusionDetails', 'view details', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
    window.open(`${WIKIBUY_URL}/s/${this.props.tld}/coupon`, '_blank');
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  render() {
    const {
      savings,
      reward,
      postCoupons,
      didTryCodes,
      running,
      onTryCodes,
      onClosePopup,
      activateCredits,
      activatingCredits,
      creditsActivated,
      autoCoupTryMoreCount,
      couponCount,
      isBonkersSavings
    } = this.props;
    const hasReward = reward && reward.amount && !postCoupons;
    const rewardForUI =
      reward.type === 'percentage' ? `${reward.amount / 100}%` : formatCurrency(reward.amount);
    const hasRewardCategories = reward && !!reward.categories;

    const isAmazon = currentDomain() === 'amazon.com';

    let alterCreditsText = false;
    let ctaText = 'Apply Savings';

    if (isAmazon || isBonkersSavings) {
      ctaText = 'Continue';
      alterCreditsText = true;
    }

    return (
      <div
        className={`savings-wrapper automatic ${hasReward ? 'has-reward' : ''} ${
          _.get(this.props, 'exclusions') ? 'has-exclusions' : ''
        } ${isAmazon ? ' amazon' : ''}`}>
        <PartnerLogo
          imageCached={true}
          useImgTag={true}
          type="cropped"
          domain={currentDomain()}
          cursor={'auto'}
          autocoup
        />
        <div className={`coupon-count ${hasReward ? '' : 'no-reward'}`}>
          {this.props.requiresInput || isBonkersSavings ? (
            <div>
              <h2>
                Code Entered
                {hasReward ? (
                  <span className="credits-text">
                    <br />
                    {alterCreditsText
                      ? `Click to get ${hasRewardCategories ? 'up to' : ''}`
                      : `Continue to get ${hasRewardCategories ? 'up to' : ''}`}
                    <span className="palmetto"> {rewardForUI} back.</span>
                  </span>
                ) : null}
              </h2>
            </div>
          ) : (
            <h2 className="result-text">
              <span>
                You saved
                <span className="palmetto"> {savings} </span> automatically!
              </span>
              {hasReward ? (
                <span className="credits-text">
                  {alterCreditsText
                    ? `Continue to get ${hasRewardCategories ? 'up to' : ''}`
                    : `Click to get ${hasRewardCategories ? 'up to' : ''}`}
                  <span className="palmetto"> {rewardForUI} back.</span>
                </span>
              ) : null}
            </h2>
          )}
        </div>
        <div>
          {didTryCodes && !running && (
            <div>
              <button
                className={`primary-btn-large`}
                disabled={running || creditsActivated || activatingCredits}
                onClick={async () => {
                  const clickId = generateClickId();
                  this.sendCtaEvent({ctaText, clickId});
                  if (hasReward) {
                    activateCredits({clickId, fromAutoRun: true, savings: true});
                    this.timeout = setTimeout(() => {
                      onClosePopup();
                    }, 750);
                  } else {
                    determineAndDropCookieAutoCoup({clickId, fromAutoRun: true});
                    onClosePopup();
                  }
                }}>
                {ctaText}
              </button>
            </div>
          )}
          {_.get(this.props, 'exclusions') && (activatingCredits || creditsActivated) ? (
            <div className={`exclusions-wrapper visible`}>
              <h4 style={{whiteSpace: 'nowrap', fontSize: '12px'}} className="try-more-link">
                *Exclusions apply,
                <span
                  style={{paddingLeft: '3px'}}
                  className="tertiary-link-lighter"
                  onClick={this.onShowExclusion}>
                  {' '}
                  view details.
                </span>
              </h4>
            </div>
          ) : null}
          {!((activatingCredits || creditsActivated) && _.get(this.props, 'exclusions')) &&
            autoCoupTryMoreCount > 0 && (
              <h4
                className={`try-more-link${
                  activatingCredits || creditsActivated ? ' invisible' : ''
                }`}
                onClick={() => {
                  onTryCodes(null, null, null, true, false, {fromAutoRun: true});
                }}>
                Try {couponCount} More {couponCount === 1 ? 'Code' : 'Codes'}
              </h4>
            )}
        </div>
      </div>
    );
  }
}

export default SavingsAvailable;
