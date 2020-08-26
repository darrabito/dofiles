import {React} from 'utility/css-ns';
import {Component} from 'react';
import {WIKIBUY_URL} from 'constants';
import RewardsActivation from './components/RewardsActivation';
import CashBackCategories from 'components/CashBackCategories';
import Gear from 'components/Gear';
import PartnerLogo from 'components/PartnerLogo';
import PageProduceImage from 'components/PageProduceImage';
import currentDomain from 'utility/currentDomain';
import sendMetric from 'utility/sendMetric';
import hasFeature from 'utility/hasFeature';
import _ from 'lodash';
import moment from 'moment';
import './cash-back-resolve.less';

class CashBackResolve extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    chrome.storage.local.get('seenCreditsReminder', ({seenCreditsReminder}) => {
      const isDailyTestGroup = hasFeature('credits_ignore_tooltip_daily');
      const isOnceTestGroup = hasFeature('credits_ignore_tooltip_once');
      let showIgnoreTooltip = !seenCreditsReminder && (isDailyTestGroup || isOnceTestGroup);

      if (seenCreditsReminder) {
        if (isDailyTestGroup) {
          showIgnoreTooltip = moment
            .unix(seenCreditsReminder / 1000)
            .add(1, 'days')
            .add(2, 'minutes')
            .isBefore(moment());
        }
      }

      this.setState({showIgnoreTooltip});
    });
  }

  onShowSettings(e) {
    e.stopPropagation();
    const url = `${WIKIBUY_URL}/account-settings/notifications?section=cashback`;
    sendMetric('trackClick', 'showSettingSiteHub', 'x', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
    window.open(url, '_blank');
  }

  onShowExclusion() {
    sendMetric('trackClick', 'viewExclusionDetails', 'view details', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
    window.open(
      `${WIKIBUY_URL}/s/${_.get(this.props.view, 'deweyResult.domain')}/coupon`,
      '_blank'
    );
  }

  onActivateLater(e) {
    e.stopPropagation();
    const reward = _.get(this.props, 'reward', {});
    const hasActivatedCompetitor = this.props.hasActivatedEbates || this.props.hasActivatedHoney;

    if (hasActivatedCompetitor) {
      this.props.onUserClosePopup('activate later', true);
      sendMetric('trackClick', 'dismissCompetitorClickWarning', 'activate later', {
        domain: location.hostname.replace(/^www\./, ''),
        pagePath: location.pathname,
        rewardAmount: reward.amount,
        rewardDisplay: reward.type
      });
    } else {
      this.props.onUserClosePopup('activate later');
    }
  }

  onConfirmDismiss() {
    const reward = _.get(this.props, 'reward', {});

    sendMetric('trackClick', 'dismissCreditReminder', '', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname,
      rewardAmount: reward.amount,
      rewardDisplay: reward.type
    });
    this.props.onUserClosePopup('activate later', true);
  }

  render() {
    const hasCategories = !!_.get(this.props, 'reward.categories');
    const {showIgnoreTooltip} = this.state;
    const hasActivatedCompetitor = this.props.hasActivatedEbates || this.props.hasActivatedHoney;
    const hasPromotionalReward =
      !!_.get(this.props, 'view.nonSegmentReward') &&
      (hasFeature('segment_rate_1') ||
        hasFeature('segment_rate_2') ||
        hasFeature('segment_rate_3') ||
        hasFeature('segment_rate_4'));
    const isSpecialOffer = hasPromotionalReward && hasFeature('segment_rate_4');
    return (
      <div className={`cash-back-resolve ${showIgnoreTooltip ? 'reminder-visible' : ''}`}>
        {hasFeature('cb_cta_ui_control') &&
        !hasActivatedCompetitor &&
        (!hasPromotionalReward || (hasPromotionalReward && !isSpecialOffer)) ? (
          <Gear onClick={this.onShowSettings.bind(this)} style={{position: 'fixed'}} />
        ) : (
          <div
            className="close icon-x"
            onClick={
              this.state.showConfirmation
                ? this.onConfirmDismiss.bind(this)
                : this.onActivateLater.bind(this)
            }
          />
        )}
        <div className="credit-prompt">
          {this.props.largeCashbackNotification &&
          !(
            hasFeature('credits_redemption_prompt') &&
            _.get(this.props, 'userCreditAmount.amount') >= 0
          ) ? (
            <div className="icon-credit" />
          ) : hasFeature('ext_coupon_product_img') ? (
            <PageProduceImage
              notificationType="cashback"
              deweyResult={this.props.deweyResult}
              domain={currentDomain()}
              cursor={'auto'}
            />
          ) : isSpecialOffer ? (
            <div className="reveal-image">
              <img
                src="https://cdn.ivaws.com/wikibuy-assets/images/upload_content/reveal.png"
                alt=""
              />
            </div>
          ) : hasFeature('ext_cnc_img_logo') ? (
            <PartnerLogo
              domain={currentDomain()}
              cursor={hasFeature('ext_cnc_point_show') ? 'pointer' : 'auto'}
            />
          ) : null}
          <RewardsActivation
            {...this.props}
            showCreditsReminder={showIgnoreTooltip}
            hasPromotionalReward={hasPromotionalReward}
            onShowExclusion={this.onShowExclusion.bind(this)}
          />
          {hasFeature('cb_cta_ui_control') &&
          !this.props.activating &&
          !this.props.activated &&
          !hasActivatedCompetitor &&
          !isSpecialOffer ? (
            <h4
              className="bold activate-later tertiary-link"
              onClick={this.onActivateLater.bind(this)}>
              Activate later
            </h4>
          ) : (
            (this.props.activated || this.props.activating || isSpecialOffer) && (
              <div>
                {_.get(this.props, 'view.exclusions') ? (
                  <h6
                    style={{
                      height: '29px',
                      marginTop: '4px',
                      marginBottom: hasCategories ? '8px' : '0',
                      display: 'flex',
                      alignItems: 'center'
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
                ) : (
                  <div style={{height: '14px'}} />
                )}
                {hasCategories ? (
                  <CashBackCategories
                    reward={this.props.reward}
                    tld={_.get(this.props.view, 'deweyResult.domain')}
                  />
                ) : null}
              </div>
            )
          )}
        </div>
      </div>
    );
  }
}

export default CashBackResolve;
