import {React} from 'utility/css-ns';
import moment from 'moment';
import {Component} from 'react';
import {Motion, spring} from 'react-motion';
import {branch} from 'higher-order/baobab';
import hasFeature from 'utility/hasFeature';
import sendMetric from 'utility/sendMetric';
import {
  dismiss,
  setSeenNotificationTooltip,
  activateThroughPinnedTab,
  activateInCurrentTab,
  setMiniCashbackTabStateAction,
  backgroundTreeSetAction
} from 'actions/cashbackActions';
import _ from 'lodash';
import isFullAccount, {isFullCustomer} from 'utility/isFullAccount';
import setSeenCashbackNotification from 'messenger/outbound/setSeenCashbackNotification';
import getHoneyActivationStatus from 'messenger/outbound/getHoneyActivationStatus';
import TooltipResolve from './components/TooltipResolve';
import CashBackResolve from './components/CashBackResolve';
import CashbackMini from './components/CashbackMini';
import CreateAccountGate from 'components/CreateAccountGate';
import './cashback.less';

class CashBack extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      hideNotification: true
    };
  }
  async componentWillReceiveProps(nextProps) {
    if (
      this.props &&
      nextProps &&
      !this.props.warnAboutStandDown &&
      nextProps.warnAboutStandDown &&
      this.state.activated
    ) {
      this.setState({
        hideNotification: false,
        activated: false,
        activating: false,
        hasActivated: true
      });
    }
  }
  componentDidMount() {
    setTimeout(async () => {
      const hasActivatedHoney = await getHoneyActivationStatus({tld: this.props.tld});
      if (document.querySelector('#honeyContainer')) {
        this.setState({compNotifLoaded: true, rightOffset: '300px'});
      }
      if (
        document.querySelector('.ebates-notification') ||
        document.querySelector('.ebates-hover.ebates-hover-top')
      ) {
        this.setState({compNotifLoaded: true, rightOffset: '410px'});
      }
      this.setState({
        hideNotification: false,
        fullScreen: hasFeature('ext_fs_opac'),
        hasActivatedHoney
      });
      setSeenCashbackNotification();
    }, 1000);

    const {bacgroundOpacityValue, backgroundOpacityClass} = this.determineBackgroundOpacity(false);
    const opacityNotification = bacgroundOpacityValue && backgroundOpacityClass;
    const renderMiniCashbackNotification =
      hasFeature('mini_cashback_tab') && _.get(this.props.view, 'showMiniTabNotification');
    const shownPromotionalRate =
      !!_.get(this.props.view, 'nonSegmentReward') &&
      (hasFeature('segment_rate_1') ||
        hasFeature('segment_rate_2') ||
        hasFeature('segment_rate_3') ||
        hasFeature('segment_rate_4'));
    if (opacityNotification) {
      backgroundTreeSetAction({
        path: ['notificationBackgroundOpacity'],
        value: moment().format(),
        persistKey: 'notificationBackgroundOpacity'
      });
    }

    sendMetric(
      'page',
      renderMiniCashbackNotification ? 'miniCashbackNotification' : 'cashbackNotification',
      {
        view: renderMiniCashbackNotification ? 'miniCashbackNotification' : 'cashbackNotification',
        type: 'notification',
        deweyResult: _.get(this.props.view, 'deweyResult.pageType'),
        domain: location.hostname.replace(/^www\./, ''),
        pagePath: location.pathname,
        offerSignUp: _.get(this.props.view, 'offerSignUp'),
        qualified: _.get(this.props.view, 'qualified', false),
        balance: _.get(this.props.view, 'balance', 0),
        opacityNotification: !!opacityNotification,
        promotionalRate: shownPromotionalRate ? 'promoSegment' : undefined,
        vendorMetaId: _.get(this.props.view, 'id')
      }
    );
  }

  determineBackgroundOpacity(hideNotificationOverride) {
    // hideNotificationOverride - due to setState being async and not wanting to call this function inside setState callback
    let {hideNotification} = this.state;
    hideNotification = _.isBoolean(hideNotificationOverride)
      ? hideNotificationOverride
      : hideNotification;
    const storeName = _.get(this.props.view, 'vendor');
    const showOnTop = !hasFeature('ext_sh_on_b');
    const showOnRight = true;
    const renderMiniCashbackNotificationTab =
      hasFeature('mini_cashback_tab') && _.get(this.props.view, 'showMiniTabNotification');
    const bacgroundOpacityValue =
      storeName.indexOf('amazon') > -1 ||
      hideNotification ||
      this.state.hideOpacityBackground ||
      renderMiniCashbackNotificationTab
        ? ''
        : hasFeature('notif_background_opacity_25')
        ? 'background-opacity-25'
        : hasFeature('notif_background_opacity_40')
        ? 'background-opacity-40'
        : '';
    const backgroundOpacityClass =
      bacgroundOpacityValue && !hideNotification && !this.state.hideOpacityBackground
        ? `background-opacity-1${!showOnTop ? '-bottom' : ''}${showOnRight ? '-right' : ''}`
        : (bacgroundOpacityValue && !hideNotification && this.state.hideOpacityBackground) ||
          this.state.hideOpacityBackground
        ? 'background-opacity-out'
        : '';

    if (
      this.props.notificationBackgroundOpacity &&
      moment().isBefore(moment(this.props.notificationBackgroundOpacity).add(1, 'week'))
    ) {
      return {};
    }
    return {
      bacgroundOpacityValue,
      backgroundOpacityClass
    };
  }

  render() {
    const accountGateType = this.state.accountGateType;
    const renderMiniCashbackNotificationTab =
      hasFeature('mini_cashback_tab') && _.get(this.props.view, 'showMiniTabNotification');
    const largeCashbackNotification =
      hasFeature('cashback_lg_cta') || hasFeature('credits_redemption_prompt');
    const {hideNotification} = this.state;
    const offerSignUp = _.get(this.props.view, 'offerSignUp');
    const storeName = _.get(this.props.view, 'vendor');
    const showOnTop = !hasFeature('ext_sh_on_b');
    const showOnRight = true;
    const showOnRightOffset = hasFeature('n_or_1') && this.state.compNotifLoaded;
    const userCreditAmount = _.get(this.props.view, 'user.credit.credits');
    const {bacgroundOpacityValue, backgroundOpacityClass} = this.determineBackgroundOpacity();
    const hasActivatedEbates = !!_.get(this.props.ebatesActivatedSites, this.props.tld);
    const hasActivatedHoney = this.state.hasActivatedHoney;

    if (this.props.couponsVisible) {
      // Hide cashback notification if coupon notification comes in later.
      return null;
    }

    const shouldShowCenterMiddle = this.shouldShowCenterMiddle();

    return (
      <div
        onClick={() => this.setState({fullScreen: false, hideOpacityBackground: true})}
        className={`${hideNotification ? 'disabled cashback-page' : 'cashback-page'} ${
          shouldShowCenterMiddle ? 'center-middle' : ''
        }  ${this.state.fullScreen ? 'fullscreen' : ''} ${backgroundOpacityClass} ${
          backgroundOpacityClass ? bacgroundOpacityValue : ''
        }`}
        style={{
          top: showOnTop ? '0' : 'auto',
          bottom: showOnTop ? 'auto' : '0',
          left: showOnRight ? 'auto' : '0',
          right: showOnRightOffset ? this.state.rightOffset : showOnRight ? '0' : 'auto'
        }}>
        <Motion
          style={{
            opacity: spring(hideNotification ? 0 : 1, {stiffness: 180, damping: 20}),
            tabOpacity: hideNotification ? 0 : 1,
            y: spring(hideNotification ? (showOnTop ? -100 : 100) : 0, {
              stiffness: 180,
              damping: 20
            }),
            tabX: hideNotification ? 80 : 0
          }}>
          {({opacity, y, tabX, tabOpacity}) =>
            !renderMiniCashbackNotificationTab ? (
              <div
                onClick={e => {
                  if (hasFeature('ext_cnc_point_show') && !accountGateType) {
                    this.onActivate(e);
                  }
                }}
                className={`${
                  largeCashbackNotification ? 'large-cb-notification' : ''
                } cashback-notification`}
                style={{
                  transform: `translate3d(0,${y}%,0)`,
                  opacity: `${opacity}`,
                  cursor: hasFeature('ext_cnc_point_show') ? 'pointer' : 'auto'
                }}>
                <header>
                  <div className="w-icon-logo" style={{height: '40px', width: '60px'}}>
                    {this.renderWIcon()}
                  </div>
                </header>
                {accountGateType ? (
                  <div style={{padding: '8px 16px 16px'}}>
                    <CreateAccountGate
                      session={this.props.session}
                      settings={this.props.settings}
                      accountGateType={accountGateType}
                      onSubmitAccountSuccess={this.onActivate.bind(this)}
                    />
                    <h4
                      className="bold activate-later tertiary-link"
                      onClick={this.onUserClosePopup.bind(this, 'Activate later')}>
                      Activate later
                    </h4>
                  </div>
                ) : (
                  <CashBackResolve
                    userCreditAmount={userCreditAmount}
                    largeCashbackNotification={largeCashbackNotification}
                    view={this.props.view}
                    hasActivated={this.state.hasActivated}
                    warnAboutStandDown={this.props.warnAboutStandDown}
                    hasActivatedEbates={hasActivatedEbates}
                    hasActivatedHoney={hasActivatedHoney}
                    reward={_.get(this.props, 'view.reward')}
                    activated={this.state.activated}
                    activating={this.state.activating}
                    hasCoupons={_.get(this.props, 'view.hasCoupons')}
                    onActivateWarn={this.onActivateWarn.bind(this)}
                    session={this.props.session}
                    showInitialSignup={this.state.showInitialSignup}
                    tld={this.props.tld}
                    activate={this.state.activate}
                    onActivate={this.determineRunCashback.bind(this)}
                    dismissNotification={() => this.setState({hideNotification: true})}
                    onUserClosePopup={this.onUserClosePopup.bind(this)}
                    deweyResult={_.get(this.props.view, 'deweyResult')}
                  />
                )}
              </div>
            ) : (
              <CashbackMini
                vendor={_.get(this.props.view, 'vendor')}
                miniCashbackTabState={this.props.miniCashbackTabState}
                setMiniCashbackTabStateAction={setMiniCashbackTabStateAction}
                activated={this.state.activated}
                activating={this.state.activating}
                activate={this.state.activate}
                onActivate={this.onActivate.bind(this)}
                reward={_.get(this.props, 'view.reward')}
                onUserClosePopup={this.onUserClosePopup.bind(this)}
                style={{
                  transform: `translate3d(${tabX}%,0,0)`,
                  opacity: `${tabOpacity}`,
                  cursor: 'pointer'
                }}
              />
            )
          }
        </Motion>
        <TooltipResolve
          showOnTop={showOnTop}
          showOnRight={showOnRight}
          offerSignUp={offerSignUp}
          storeName={storeName}
          hideNotification={hideNotification}
          onDismissTooltip={this.onDismissTooltip.bind(this)}
          hasSeenCashbackSignupTip={_.get(this.props, 'events.hasSeenCashbackSignupTip')}
          hasSeenCashbackActivateTip={_.get(this.props, 'events.hasSeenCashbackActivateTip')}
        />
      </div>
    );
  }

  determineRunCashback(options) {
    const hasFullAccount = isFullAccount();
    const fullCustomer = isFullCustomer();
    const type = !hasFullAccount ? 'noAccount' : !fullCustomer ? 'addName' : null;
    if (type && hasFeature('auth_gate_cashback')) {
      this.setState({accountGateType: type});
      activateThroughPinnedTab();
    } else {
      this.onActivate(options);
    }
  }

  onDismissTooltip(type) {
    if (!_.get(this.props, `events.${type}`)) {
      setSeenNotificationTooltip(type);
    }
  }
  async onActivateWarn() {
    const reward = _.get(this.props.view, 'reward', {});
    const exclusions = _.get(this.props.view, 'exclusions', null);
    const timeout = exclusions ? 3000 : 1500;
    sendMetric('trackClick', 'activateCashback', 'reactivate', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname,
      rewardAmount: reward.amount,
      rewardDisplay: reward.type,
      reactivate: true,
      view: 'creditCompetitorClickWarning'
    });
    this.setState({activating: true});
    const resp = await activateThroughPinnedTab();
    this.setState({activated: true});
    setTimeout(() => {
      this.setState({hideNotification: true});
    }, timeout);
    sendMetric(
      'track',
      'activateCashbackRedirect',
      _.assign(
        {
          domain: location.hostname.replace(/^www\./, ''),
          pagePath: location.pathname,
          rewardAmount: reward.amount,
          rewardDisplay: reward.type,
          reactivate: true
        },
        resp
      )
    );
  }
  async onActivate(options = {}) {
    const reward = _.get(this.props.view, 'reward', {});
    const hasCoupons = _.get(this.props.view, 'hasCoupons');
    // const exclusions = _.get(this.props.view, 'exclusions', null);
    // const timeout = exclusions ? 3000 : 1500;
    const timeout = !hasCoupons ? 5000 : 1500;
    this.setState({activating: true, accountGateType: null});
    this.onDismissTooltip('hasSeenCashbackActivateTip');
    const domain = location.hostname.replace(/^www\./, '');
    sendMetric('trackClick', 'activateCashback', 'activate', {
      domain,
      pagePath: location.pathname,
      rewardAmount: reward.amount,
      rewardDisplay: reward.type,
      view: options.view
    });
    const deweyResultMeta = _.get(this, 'props.view.deweyResult.pageData.meta');
    let currentTabEnabledForPath = true;
    if (
      deweyResultMeta &&
      _.find(deweyResultMeta, item => _.has(item, 'disable_aff_link_current_tab'))
    ) {
      currentTabEnabledForPath = false;
    }
    if (currentTabEnabledForPath && _.get(this.props, 'view.affiliateLinkCurrentTab')) {
      const resp = await activateInCurrentTab();
      sendMetric(
        'track',
        'activateCashbackRedirect',
        _.assign(
          {
            domain,
            pagePath: location.pathname,
            rewardAmount: reward.amount,
            rewardDisplay: reward.type
          },
          resp
        )
      );
      location.href = resp.affiliateUrl;
      return;
    } else {
      const resp = await activateThroughPinnedTab();
      this.setState({activated: true});
      if (!options.preventHide) {
        setTimeout(() => {
          this.setState({hideNotification: true});
        }, timeout);
      }
      sendMetric(
        'track',
        'activateCashbackRedirect',
        _.assign(
          {
            domain,
            pagePath: location.pathname,
            rewardAmount: reward.amount,
            rewardDisplay: reward.type
          },
          resp
        )
      );
    }
  }
  onUserClosePopup(label, suppressEvent = false) {
    const reward = _.get(this.props.view, 'reward', {});
    // Dimiss notifcation if done on a matched route
    if (
      _.get(this.props.view, 'user.hasSeenFirst') ||
      _.get(this.props.view, 'isCashbackURLMatch')
    ) {
      dismiss();
    }
    this.setState({hideNotification: true});
    if (_.get(this.props.view, 'offerSignUp')) {
      this.onDismissTooltip('hasSeenCashbackSignupTip');
    } else {
      this.onDismissTooltip('hasSeenCashbackActivateTip');
    }
    if (!suppressEvent) {
      sendMetric('trackClick', 'dismissCashbackNotification', label, {
        domain: location.hostname.replace(/^www\./, ''),
        pagePath: location.pathname,
        rewardAmount: reward.amount,
        rewardDisplay: reward.type
      });
    }
  }
  renderWIcon() {
    return (
      <svg id="Layer_1" x="0px" y="0px" viewBox="0 0 60 45">
        <g>
          <path
            d="M39.4,35.9h-9L25,19.1h-0.1l-5.2,16.8h-9L1.3,8.8h9.6L15.7,26h0.1l4.9-17.2h8.9l5,17.2h0.1l4.8-17.2h9.3
          L39.4,35.9z M57.7,31.6c0,0.7-0.1,1.4-0.4,2c-0.2,0.6-0.6,1.1-1,1.6c-0.4,0.4-1,0.8-1.7,1s-1.3,0.3-2,0.3c-1.5,0-2.7-0.5-3.7-1.4
          c-1-0.9-1.4-2-1.4-3.5c0-0.7,0.1-1.3,0.4-1.8c0.2-0.7,0.6-1.3,1-1.6c0.8-0.7,1.4-1,1.7-1.1c0.9-0.3,1.6-0.4,2-0.4
          c0.7,0,1.4,0.1,2,0.4c0.7,0.2,1.2,0.6,1.7,1c0.3,0.3,0.7,0.8,1.1,1.6C57.6,30.2,57.7,30.8,57.7,31.6z"
          />
        </g>
      </svg>
    );
  }

  shouldShowCenterMiddle() {
    const orderTotal = _.get(this.props, 'deweyResult.pageData.order.total');
    if (hasFeature('ext_cp_full_screen') && orderTotal > 7500) {
      return true;
    }
  }
}

export default branch(
  {
    view: ['cashbackView'],
    events: ['events'],
    session: ['session'],
    settings: ['settings'],
    tld: ['siteAPIData', 'siteData', 'tld'],
    warnAboutStandDown: ['warnAboutStandDown'],
    ebatesActivatedSites: ['ebatesActivatedSites'],
    honeyActivatedSites: ['honeyActivatedSites'],
    couponsVisible: ['couponsVisible'],
    miniCashbackTabState: ['miniCashbackTabState'],
    notificationBackgroundOpacity: ['notificationBackgroundOpacity']
  },
  CashBack
);
