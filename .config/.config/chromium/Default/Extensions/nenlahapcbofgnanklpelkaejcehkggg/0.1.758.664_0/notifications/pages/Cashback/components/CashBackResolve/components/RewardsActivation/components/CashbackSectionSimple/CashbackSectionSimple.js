import {React} from 'utility/css-ns';
import {Component} from 'react';
import tldjs from 'tldjs';
import sendMetric from 'utility/sendMetric';
import _ from 'lodash';
import hasFeature from 'utility/hasFeature';
import isFullAccount from 'utility/isFullAccount';
import formatCurrency from 'utility/formatCurrency';
import getExpectedPayoutDate from 'utility/getExpectedPayoutDate';
import Tooltip from 'components/Tooltip';
import {WIKIBUY_URL} from 'constants';
import CreditsRedemptionPrompt from './CreditsRedemptionPrompt';
import './cashback-section-simple.less';

class CashbackSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoggedIn: isFullAccount(),
      showCreditsReminder: props.showCreditsReminder
    };
    this.ebatesComparisonSiteList = [
      'macys.com',
      'oakley.com',
      'puritanspride.com',
      'ebay.com',
      'walmart.com',
      'marriott.com',
      'sephora.com',
      'zulily.com',
      'tirerack.com',
      'ancestry.com',
      'samsclub.com',
      'samsung.com',
      'nordvpn.com',
      'priceline.com',
      'qvc.com',
      'microsoftstore.com',
      'starwoodhotels.com',
      'discounttire.com',
      'officedepot.com',
      'lifelock.com',
      'omahasteaks.com',
      'woot.com',
      'coursera.org',
      'sixt.com',
      'wsj.com',
      'gilt.com'
    ];
    this.activatedStateExclusions = ['marriott.com', 'vrbo.com', 'homeaway.com'];
  }
  componentWillReceiveProps(nextProps) {
    if (
      nextProps.showCreditsReminder !== this.state.showCreditsReminder &&
      !this.state.didDismiss
    ) {
      this.setState({showCreditsReminder: nextProps.showCreditsReminder});
    }
  }
  renderHeadline() {
    const reward = _.get(this.props.view, 'reward');
    const nonSegmentReward = _.get(this.props.view, 'nonSegmentReward');
    const getRewardText = rewardObj =>
      rewardObj.type !== 'fixed' ? `${rewardObj.amount / 100}%` : formatCurrency(rewardObj.amount);
    const rewardText = getRewardText(reward);
    const nonSegmentRewardText = nonSegmentReward ? getRewardText(nonSegmentReward) : null;

    if (this.props.hasPromotionalReward) {
      if (hasFeature('segment_rate_1')) {
        return (
          <h2>
            Get {!!reward.categories ? 'up to ' : ''}
            <span className="palmetto">{rewardText}</span> back on your first purchase
          </h2>
        );
      } else if (hasFeature('segment_rate_2')) {
        return (
          <h2>
            Special One-Time Offer:
            <br />
            Get {!!reward.categories ? 'up to ' : ''}
            <span className="base-amount">{nonSegmentRewardText}</span>{' '}
            <span className="palmetto">{rewardText}</span> back
          </h2>
        );
      } else if (hasFeature('segment_rate_3')) {
        return (
          <h2>
            Get {!!reward.categories ? 'up to ' : ''}
            <span className="base-amount">{nonSegmentRewardText}</span>{' '}
            <span className="palmetto">{rewardText}</span> back
          </h2>
        );
      } else if (hasFeature('segment_rate_4')) {
        return <h2>{"Check out today's offer available specially for you!"}</h2>;
      }
    }

    return (
      <h2>
        Get {!!reward.categories ? 'up to ' : ''}
        {rewardText} back
      </h2>
    );
  }
  render() {
    const activating = this.props.activating && !this.state.hasClickedToLogin;
    const activated = this.props.activated && !this.state.hasClickedToLogin;

    const reward = _.get(this.props.view, 'reward');
    const nonSegmentReward = _.get(this.props.view, 'nonSegmentReward');
    const nonSegmentRewardText = nonSegmentReward
      ? nonSegmentReward.type !== 'fixed'
        ? `${nonSegmentReward.amount / 100}%`
        : formatCurrency(nonSegmentReward.amount)
      : null;
    const storeName = _.get(this.props.view, 'vendor');
    const deweyResult = _.get(this.props.view, 'deweyResult');
    const showRewardInNotification = _.get(this.props.view, 'showRewardInNotification');
    const payoutProcessingPeriod = _.get(this.props.view, 'payoutProcessingPeriod', {});

    const cartTotal =
      hasFeature('cb_notification_dollar_amt') && _.get(deweyResult, 'pageData.order.total');
    let cbDollarAmt;
    if (cartTotal && reward.type === 'percentage') {
      if (reward.amount) {
        cbDollarAmt = _.round((cartTotal / 100) * (reward.amount / 100), 2);
      }
    } else if (reward.type !== 'percentage') {
      if (reward.amount) {
        cbDollarAmt = formatCurrency(reward.amount);
      }
    }

    const showOffer = activating || activated;
    const showCashbackAmount =
      hasFeature('cb_show_amount') ||
      (hasFeature('cb_show_amount_above_five') && reward.amount / 100 >= 5) ||
      !!reward.categories ||
      this.props.hasPromotionalReward;
    const isSpecialOffer = !!nonSegmentReward && hasFeature('segment_rate_4');
    const cta = isSpecialOffer ? (
      'Reveal and Activate'
    ) : hasFeature('credits_redemption_prompt') ? (
      cbDollarAmt ? (
        <span>
          Activate <span>{cbDollarAmt}</span> in credit
        </span>
      ) : (
        <span>
          Activate <span>{reward.amount / 100}%</span> back
        </span>
      )
    ) : (
      'Ok'
    );
    const showActivatedState =
      activated &&
      (!this.props.hasCoupons || nonSegmentReward) &&
      hasFeature('credits_activated_set_expectations') &&
      !_.includes(this.activatedStateExclusions, this.props.tld);

    return (
      <div className="simple-section">
        {!showActivatedState &&
          (!showOffer ? (
            showCashbackAmount ? (
              this.renderHeadline()
            ) : (
              <h2>Found 1 offer</h2>
            )
          ) : cbDollarAmt ? (
            <h2>
              Activating <span className="base-amount">{nonSegmentRewardText}</span>{' '}
              <span className="green">{cbDollarAmt}</span> in credit
            </h2>
          ) : (
            <h2>
              Activating <span className="base-amount">{nonSegmentRewardText}</span>{' '}
              <span className="green">{reward.amount / 100}%</span> back
            </h2>
          ))}
        {!showActivatedState &&
          (!showOffer && showRewardInNotification ? (
            cbDollarAmt ? (
              <h4>
                <span>{cbDollarAmt}</span> in credit.
              </h4>
            ) : (
              <h4>
                <span>{reward.amount / 100}%</span> back.
              </h4>
            )
          ) : hasFeature('segment_rate_2') ? (
            <h4 className="bold">on your {storeName} purchase.</h4>
          ) : !isSpecialOffer || (isSpecialOffer && (activating || activated)) ? (
            <h4 className="bold">at {storeName}.</h4>
          ) : null)}

        {!showActivatedState && !activated && !activating && isSpecialOffer && (
          <h5 className="special-offer-text">
            Click to reveal and activate your special rate for {storeName}.
          </h5>
        )}

        {showActivatedState && (
          <React.Fragment>
            <h2>
              {!!reward.categories && 'Up to '}
              {this.props.hasPromotionalReward && (
                <React.Fragment>
                  <span className="base-amount">{nonSegmentRewardText}</span>{' '}
                </React.Fragment>
              )}
              <span className="green">{cbDollarAmt ? cbDollarAmt : `${reward.amount / 100}%`}</span>{' '}
              back in Wikibuy Credit is activated!
            </h2>
            <h5 className="activated-text">
              Complete your purchase now to receive your Credit by{' '}
              <span className="bold">{getExpectedPayoutDate(payoutProcessingPeriod)}</span>.
            </h5>
            <h5 className="activated-text">
              We’ll email you when your Credit is ready to redeem for gift cards from top merchants.
            </h5>
          </React.Fragment>
        )}

        {hasFeature('credits_redemption_prompt') &&
        _.get(this.props, 'userCreditAmount.amount') >= 0 ? (
          <CreditsRedemptionPrompt
            rewardAmount={cbDollarAmt || reward.amount}
            userCreditAmount={this.props.userCreditAmount}
          />
        ) : null}

        {!activated &&
          !activating &&
          _.get(this.props, 'view.exclusions') &&
          !!nonSegmentReward &&
          !hasFeature('segment_rate_4') && (
            <h6
              style={{
                marginTop: '-8px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center'
              }}>
              Exclusions apply,
              <span
                style={{paddingLeft: '3px'}}
                className="tertiary-link-lighter"
                onClick={this.props.onShowExclusion}>
                {' '}
                view details.
              </span>
            </h6>
          )}

        {isFullAccount() || hasFeature('auth_gate_cashback') ? (
          <div className="button-wrapper">
            {this.renderControl(cta)}
            {this.state.showCreditsReminder && !(activated || activating) ? (
              <Tooltip
                tip
                isCreditsReminderMessage
                tipLabel={'Activating Wikibuy Credit is completely free.'}
                message={
                  <span className="dismiss-text">
                    Click the “Ok” button to activate credit back on your purchases that you can
                    redeem for gift cards at top stores.
                  </span>
                }
                delay={'7000ms'}
                style={{
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '360px',
                  right: 'calc(100% + 16px)'
                }}
                onDismissTooltip={this.onDismissTooltip.bind(this)}
              />
            ) : null}
          </div>
        ) : (
          <div className="button-wrapper">
            <button className="primary-btn-large" onClick={this.onClickSignIn.bind(this)}>
              {cta}
            </button>
          </div>
        )}
      </div>
    );
  }

  renderControl(cta) {
    const activating = this.props.activating && !this.state.hasClickedToLogin;
    const activated = this.props.activated && !this.state.hasClickedToLogin;
    const buttonPulse = hasFeature('ext_cnc_btn_pulse');
    const isSpecialOffer =
      !!_.get(this.props.view, 'nonSegmentReward') && hasFeature('segment_rate_4');
    return activated ? (
      <button className="primary-btn-large" disabled={true}>
        Activated
      </button>
    ) : activating ? (
      <button className="primary-btn-large" disabled={true}>
        Activating
      </button>
    ) : (
      <button
        className={`primary-btn-large ${buttonPulse ? 'button-pulse' : ''} ${
          isSpecialOffer ? 'reveal-btn' : ''
        }`}
        onClick={e => {
          e.stopPropagation();
          this.props.onActivate();
        }}>
        {cta || 'Ok'}
      </button>
    );
  }

  onClickSignIn(e) {
    e.stopPropagation();
    const storeName = _.get(this.props.view, 'vendor');
    if (storeName !== 'eBay') {
      this.props.onActivate({preventHide: !this.state.hasClickedToLogin});
    }
    sendMetric('track', 'signinRequired', {
      vendor: storeName
    });
    window.open(`${WIKIBUY_URL}/sign-in`);
    this.setState({hasClickedToLogin: true});
  }

  onChangeValue(percent) {
    if (!isFullAccount() && !this.state.hasClickedToLogin) {
      this.onClickSignIn();
    } else {
      this.props.onActivate();
      this.setState({percent});
      this.setState({hasClickedToLogin: false});
    }
  }

  onDismissTooltip() {
    const reward = _.get(this.props.view, 'reward');
    this.setState({showCreditsReminder: false, didDismiss: true});
    sendMetric('trackClick', 'dismissCreditIgnoreTooltip', 'dimiss tooltip', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname,
      rewardAmount: reward.amount,
      rewardDisplay: reward.type
    });
  }
}

export default CashbackSection;
