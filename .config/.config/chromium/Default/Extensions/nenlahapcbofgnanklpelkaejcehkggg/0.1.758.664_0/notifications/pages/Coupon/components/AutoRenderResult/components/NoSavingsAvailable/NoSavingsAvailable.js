import PartnerLogo from 'components/PartnerLogo';
import uuid from 'node-uuid';
import {React} from 'utility/css-ns';
import {WIKIBUY_URL} from 'constants';
import {Component} from 'react';
import sendMetric from 'utility/sendMetric';
import currentDomain from 'utility/currentDomain';
import formatCurrency from 'utility/formatCurrency';
import _ from 'lodash';
import generateClickId from 'utility/generateClickId';
import dashUuid from 'common/utility/dashUuid';
import './no-savings-available.less';

class NoSavingsAvailable extends Component {
  constructor(...args) {
    super(...args);
    this.onShowExclusion = this.onShowExclusion.bind(this);
  }

  componentDidMount() {
    if (currentDomain() === 'amazon.com') {
      setTimeout(() => this.props.onClosePopup(), 5000);
    }
  }

  sendCtaEvent({ctaText, clickId, couponRunId} = {}) {
    const redirectId = dashUuid(clickId);
    sendMetric('track', 'couponsModalClickCta', {
      domain: this.props.domain,
      pagePath: location.pathname,
      coupons: this.props.couponsFromResult,
      bestCoupon: this.props.bestCode,
      savings: this.props.rawSavings,
      cashback: this.props.isCashback,
      triggerType: 'auto',
      ctaText,
      runDuration: _.get(this, 'props.runDuration'),
      clickId,
      redirectId,
      couponRunId
    });
  }

  onShowExclusion() {
    sendMetric('trackClick', 'viewExclusionDetails', 'view details', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
    window.open(`${WIKIBUY_URL}/s/${this.props.tld}/coupon`, '_blank');
  }

  render() {
    const {
      couponCount,
      reward,
      postCoupons,
      onTryCodes,
      activatingCredits,
      creditsActivated
    } = this.props;
    const hasReward = reward && reward.amount && !postCoupons;

    const continueCtaText = 'Try Codes';

    const exclusions = _.get(this.props, 'exclusions');
    const isAmazon = currentDomain() === 'amazon.com';

    return (
      <div className={`no-savings-wrapper automatic${isAmazon ? ' amazon' : ''}`}>
        {currentDomain() === 'amazon.com' ? (
          <h2 className="left">
            <span>Coupon Clipped</span>
          </h2>
        ) : (
          <div>
            <PartnerLogo
              imageCached={true}
              useImgTag={true}
              type="cropped"
              domain={currentDomain()}
              cursor={'auto'}
              autocoup
            />
            <h2 className="left">
              <span>
                Found {couponCount} {couponCount === 1 ? 'code' : 'codes'}
              </span>
              {hasReward ? (
                <span>
                  {' '}
                  and <br />
                  get {!!reward.categories && 'up to '}
                  <span className="palmetto">
                    {reward.type === 'percentage'
                      ? `${reward.amount / 100}% back`
                      : `${formatCurrency(reward.amount)} in credit`}
                  </span>
                </span>
              ) : null}
            </h2>
          </div>
        )}
        <h4 className="bold left">Wikibuy tests codes in seconds.</h4>
        <div>
          {hasReward ? (
            <button
              className={`primary-btn-large`}
              onClick={async () => {
                const clickId = generateClickId();
                const couponRunId = uuid.v4();
                this.sendCtaEvent({ctaText: continueCtaText, clickId, couponRunId});
                onTryCodes(null, null, null, true, false, {
                  fromAutoRun: true,
                  clickId,
                  couponRunId
                });
              }}>
              {continueCtaText}
            </button>
          ) : (
            <button
              className={`primary-btn-large`}
              onClick={() => {
                const clickId = generateClickId();
                const couponRunId = uuid.v4();
                this.sendCtaEvent({ctaText: continueCtaText, clickId, couponRunId});
                onTryCodes(null, null, null, true, false, {
                  fromAutoRun: true,
                  clickId,
                  couponRunId
                });
              }}>
              {continueCtaText}
            </button>
          )}
          {(creditsActivated || activatingCredits) && exclusions ? (
            <div
              className={`exclusions-wrapper ${
                activatingCredits || creditsActivated ? 'visible' : 'invisible'
              }`}>
              <h6
                style={{
                  height: '19px',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                *Exclusions apply,
                <span
                  style={{paddingLeft: '3px'}}
                  className="tertiary-link-lighter"
                  onClick={this.onShowExclusion}>
                  {' '}
                  view details.
                </span>
              </h6>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

export default NoSavingsAvailable;
