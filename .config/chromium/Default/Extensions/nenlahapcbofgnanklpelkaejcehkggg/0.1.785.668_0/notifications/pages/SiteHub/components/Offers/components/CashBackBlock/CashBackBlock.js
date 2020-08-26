import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import sendMetric from 'utility/sendMetric';
import {saveNotificationSettings} from 'actions/offersActions';
import RewardsText from './components/RewardsText';
import ActivateButton from './components/ActivateButton';
import hasFeature from 'utility/hasFeature';
import isFullAccount from 'utility/isFullAccount';
import formatCurrency from 'utility/formatCurrency';
import getExpectedPayoutDate from 'utility/getExpectedPayoutDate';
import {WIKIBUY_URL} from 'constants';
import './cash-back-block.less';

class CashBackBlock extends Component {
  constructor(props) {
    super(props);
    this.toggleSettingsVisible = this.toggleSettingsVisible.bind(this);
    this.handleSaveNotificationSettings = this.handleSaveNotificationSettings.bind(this);
    this.state = {
      settingsVisible: false,
      notificationSetting: _.get(props.cashback, 'user.notifications.notificationSetting'),
      isFullAccount: isFullAccount()
    };
    this.activatedStateExclusions = ['marriott.com', 'vrbo.com', 'homeaway.com'];
  }
  toggleSettingsVisible() {
    const settingsVisible = this.state.settingsVisible;
    if (!settingsVisible) {
      sendMetric('trackClick', 'viewCashBackNotificationSettings');
    }
    this.setState({settingsVisible: !settingsVisible});
  }
  async handleSaveNotificationSettings(notificationSetting) {
    this.setState({notificationSetting});
    await saveNotificationSettings({notificationSetting});
    this.toggleSettingsVisible();
    sendMetric('track', 'saveCashBackNotificationSettings', {
      setting: notificationSetting
    });
  }
  renderActivatedState() {
    const {cashback, reward} = this.props;
    return (
      <React.Fragment>
        <h2>
          {!!reward.categories ? 'Up to ' : ''}
          <span className="green">
            {reward.type === 'percentage'
              ? `${reward.amount / 100}%`
              : formatCurrency(reward.amount)}
          </span>{' '}
          back in Wikibuy Credit is activated!
        </h2>
        <h5 className="activated-text">
          Complete your purchase now to receive your Credit by{' '}
          <span className="bold">{getExpectedPayoutDate(cashback.payoutProcessingPeriod)}</span>.
        </h5>
        <h5 className="activated-text">
          We’ll email you when your Credit is ready to redeem for gift cards from top merchants.
        </h5>
      </React.Fragment>
    );
  }
  render() {
    const {activated, activating, storeName, reward, hasCoupons, tld} = this.props;
    const shouldRenderActivatedState =
      activated &&
      !hasCoupons &&
      hasFeature('credits_activated_set_expectations') &&
      !_.includes(this.activatedStateExclusions, tld);

    return (
      <div className="wb-cash-back-block-section">
        {shouldRenderActivatedState && this.renderActivatedState()}
        {!shouldRenderActivatedState && <RewardsText storeName={storeName} reward={reward} />}
        <ActivateButton {...this.props} />
        {(activated || activating) && _.get(this.props, 'exclusions') ? (
          <h6 style={{height: '29px', marginTop: '4px', display: 'flex', alignItems: 'center'}}>
            *Exclusions apply,
            <span
              style={{paddingLeft: '3px'}}
              className="tertiary-link-lighter"
              onClick={this.onShowExclusion.bind(this)}>
              view details.
            </span>
          </h6>
        ) : null}
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

export default CashBackBlock;
