import {React} from 'utility/css-ns';
import tree from 'state';
import uuid from 'node-uuid';
import moment from 'moment';
import {Component} from 'react';
import {Motion, spring} from 'react-motion';
import {branch} from 'higher-order/baobab';
import _ from 'lodash';
import Bluebird from 'bluebird';

// Actions
import {
  tryCodes as tryTigger,
  throttleNotification,
  updateEmailSubscriptions,
  activateInCurrentTab,
  dropCookie,
  checkAutoCoupEnabled
} from 'actions/couponActions';
import {tryCodes as tryRoo, cancelRoo} from 'actions/rooActions';
import {
  setSeenNotificationTooltip,
  activateThroughPinnedTab,
  backgroundTreeSetAction
} from 'actions/cashbackActions';
import {getContentApiStores} from 'actions/contentApiActions';

// Local Components
import CouponHeader from './components/CouponHeader';
import RenderResult from './components/RenderResult';
import AutoRenderResult from './components/AutoRenderResult';
import NoScript from './components/NoScript';

// Components
import Tooltip from 'components/Tooltip';
import CreateAccountGate from 'components/CreateAccountGate';

// Utilities
import isFullAccount, {isFullCustomer} from 'utility/isFullAccount';
import hasFeature from 'utility/hasFeature';
import sendMetric from 'utility/sendMetric';
import currentDomain from 'utility/currentDomain';
import delay from 'utility/delay';
import generateClickId from 'utility/generateClickId';
import dashUuid from 'common/utility/dashUuid';

// LESS
import './coupon.less';
import './invite-friends.less';
import './review-wikibuy.less';

let selfDismiss;

class Coupon extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      hideNotification: true,
      viewCodes: false,
      running: this.props.view.rooRunning,
      rooRunning: this.props.view.rooRunning,
      didTryCodes: this.props.view.rooRunning || this.props.view.pageWasReloaded || false,
      result: this.props.view.result,
      roo: this.props.view.roo,
      showThrottleToolTip: this.props.view.showThrottleToolTip,
      showAutoCoupToolTip:
        currentDomain() === 'amazon.com' ? false : this.props.view.showAutoCoupToolTip,
      settings: this.props.settings,
      ctaLoading: false,
      automaticCouponsEnabled: checkAutoCoupEnabled()
    };
    this.activateCreditsAfterAutomatic = this.activateCreditsAfterAutomatic.bind(this);
    this.isRewardSite = this.isRewardSite.bind(this);
  }

  async getContentAPiData() {
    if (hasFeature('content_data')) {
      const data = await getContentApiStores();
      this.setState({storeContentApiData: data});
    }
  }

  componentWillMount() {
    // Check to see if we started with a affiliate redirect page refresh
    if (localStorage.getItem('__wb_redirecting')) {
      localStorage.removeItem('__wb_redirecting');
      this.setState({redirectInCurrentTab: false}, () => {
        this.onTryCodes(null, null, null, null, true);
      });
    } else if (_.get(this.props, 'view.affiliateLinkCurrentTab')) {
      this.setState({redirectInCurrentTab: true});
    }
  }

  componentDidMount() {
    this.getContentAPiData();

    this.checkForCompetitorNotifs();

    this.boundCloseModal = this.closeModalOnClickOutside.bind(this);
    window.addEventListener('click', this.boundCloseModal);

    if (
      this.props.view.shouldTryCoupons &&
      !this.state.didTryCodes &&
      !this.state.running &&
      !this.preparingToRun
    ) {
      this.preparingToRun = true;
      this.setState(
        {
          hideNotification: false,
          didTryCodes: false,
          result: null,
          running: true,
          barComplete: false
        },
        () => {
          this.onTryCodes(null, null, true, false, false);
          this.preparingToRun = false;
        }
      );
    }

    const {bacgroundOpacityValue, backgroundOpacityClass} = this.determineBackgroundOpacity(false);
    const opacityNotification = bacgroundOpacityValue && backgroundOpacityClass;
    if (opacityNotification) {
      backgroundTreeSetAction({
        path: ['notificationBackgroundOpacity'],
        value: moment().format(),
        persistKey: 'notificationBackgroundOpacity'
      });
    }

    const isSiteHub = tree.get('couponNotif') === 'siteHub';
    const runAutomatically = !this.state.disableAutomatic && this.state.automaticCouponsEnabled;
    if (runAutomatically && this.state.result) {
      // don't send if autocoup still running
      this.sendCouponNotificationEvent(opacityNotification, runAutomatically);
    } else if (!runAutomatically) {
      this.sendCouponNotificationEvent(opacityNotification, runAutomatically, isSiteHub);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.result !== prevState.result) {
      let autoFallback;
      let isSiteHub = tree.get('couponNotif') === 'siteHub';
      const runAutomatically = !this.state.disableAutomatic && this.state.automaticCouponsEnabled;
      if (this.state.result) {
        autoFallback = this.state.result.autoFallback;
      }

      const {bacgroundOpacityValue, backgroundOpacityClass} = this.determineBackgroundOpacity(
        false
      );
      const opacityNotification = bacgroundOpacityValue && backgroundOpacityClass;
      if (runAutomatically || autoFallback) {
        this.sendCouponNotificationEvent(opacityNotification, runAutomatically);
      } else if (!runAutomatically) {
        this.sendCouponNotificationEvent(opacityNotification, runAutomatically, isSiteHub);
        if (this.state.result && isSiteHub) {
          // reset isSiteHub after we get results in case we throttle
          tree.unset('couponNotif');
          isSiteHub = false;
        }
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (
      (!this.preparingToRun &&
        !this.state.running &&
        !this.state.didTryCodes &&
        nextProps.view.shouldTryCoupons &&
        !this.props.view.shouldTryCoupons) ||
      (this.state.didTryCodes && nextProps.view.forceTryCoupons && !this.props.view.forceTryCoupons)
    ) {
      this.preparingToRun = true;
      this.setState(
        {
          hideNotification: false,
          didTryCodes: false,
          result: null,
          running: true,
          barComplete: false,
          roo: nextProps.view.roo,
          automaticCouponsEnabled: false // when coming from sitehub, don't run autocoup
        },
        () => {
          this.onTryCodes(null, null, true);
          this.preparingToRun = false;
        }
      );

      if (nextProps.view.forceTryCoupons) {
        return;
      }
    }

    const stateUpdate = {};

    if (this.state.rooRunning && this.props.view.rooRunning && !nextProps.view.rooRunning) {
      stateUpdate.running = false;
      stateUpdate.rooRunning = false;
    }

    if (
      !this.props.view.shouldDismissTooltip &&
      nextProps.view.shouldDismissTooltip &&
      !this.state.running &&
      !this.state.result
    ) {
      this.onDismissTooltip();
    }

    if (nextProps.view.result) {
      stateUpdate.result = nextProps.view.result;
    }

    if (nextProps.view.roo) {
      stateUpdate.roo = nextProps.view.roo;
    }

    if (_.has(nextProps, 'view.showThrottleToolTip')) {
      stateUpdate.showThrottleToolTip = nextProps.view.showThrottleToolTip;
    }

    if (_.has(nextProps, 'view.hideThrottleToolTip')) {
      stateUpdate.hideThrottleToolTip = nextProps.view.hideThrottleToolTip;
    }
    this.setState(stateUpdate);
    if (_.has(nextProps, 'shouldHidePrompt') && nextProps.shouldHidePrompt === true) {
      if (
        !nextProps.shouldShowSPAPrompt &&
        !this.state.hideNotification &&
        !this.state.running &&
        !this.state.results &&
        hasFeature('spa_prompt')
      ) {
        tree.unset('shouldHidePrompt');
        this.setState({hideNotification: true});
        sendMetric('track', 'hideSPAPrompt', {
          domain: currentDomain(),
          currentLocation: _.pick(window.location, [
            'hash',
            'host',
            'hostname',
            'href',
            'origin',
            'pathname',
            'port',
            'search'
          ]) // eslint-disable-line prettier/prettier
        });
      }
    }
    if (_.has(nextProps, 'shouldShowSPAPrompt') && nextProps.shouldShowSPAPrompt === true) {
      if (
        this.state.hideNotification &&
        !this.state.running &&
        !this.state.result &&
        hasFeature('spa_prompt')
      ) {
        tree.unset('shouldShowSPAPrompt');
        this.setState({hideNotification: false});
        sendMetric('track', 'showSPAPrompt', {
          domain: currentDomain(),
          currentLocation: _.pick(window.location, [
            'hash',
            'host',
            'hostname',
            'href',
            'origin',
            'pathname',
            'port',
            'search'
          ]) // eslint-disable-line prettier/prettier
        });
      }
    }
  }

  async checkForCompetitorNotifs() {
    this.setState({hideNotification: false});
    // prompt regardless then use backoff to adjust position
    let backoff = 200;
    let tries = 1;
    while (backoff < 7000) {
      const honeyContainer = document.querySelector('#honeyContainer');
      const piggyNotif = document.querySelector('#piggyWrapper');
      if (honeyContainer) {
        const honeyStyles = honeyContainer.shadowRoot.querySelector('#honey-shadow').style;
        const honeyNotif = honeyContainer.shadowRoot.querySelector('#cornerContent');
        if (honeyNotif && (honeyStyles.opacity === '1' || honeyStyles.visibility === 'visible')) {
          this.setState({compNotifLoaded: true, rightOffset: '310px'});
        }
      }
      if (piggyNotif) {
        if (piggyNotif.offsetWidth > 0 || piggyNotif.offsetHeight > 0) {
          this.setState({compNotifLoaded: true, rightOffset: '340px'});
        }
      }
      if (
        document.querySelector('.ebates-notification') ||
        document.querySelector('.ebates-hover.ebates-hover-top')
      ) {
        this.setState({compNotifLoaded: true, rightOffset: '420px'});
      }

      await delay(backoff);

      if (tries > 25) {
        // try every 200ms for 5s, then initiate exp backoff
        backoff *= 1.5;
      }
      if ((this.state.running || this.state.results) && !this.state.automaticCouponsEnabled) {
        break;
      }
      tries += 1;
    }
  }

  isRewardSite() {
    return _.get(this.props, 'cashbackView.reward') &&
      !_.get(this.props, 'view.disableCreditsOverride')
      ? _.get(this.props, 'cashbackView.reward')
      : false;
  }

  determineBackgroundOpacity(hideNotificationOverride) {
    // hideNotificationOverride - due to setState being async and not wanting to call this function inside setState callback
    let {hideNotification} = this.state;
    hideNotification = _.isBoolean(hideNotificationOverride)
      ? hideNotificationOverride
      : hideNotification;
    const showOnTop = !hasFeature('ext_sh_on_b');
    const showOnRight = true;
    const shouldShowCenterMiddle = this.shouldShowCenterMiddle();
    const fullPageModal = this.shouldShowFullPage()
      ? `full-page ${!hasFeature('coupon_invite_friends') ? 'invite-friends-full' : ''}`
      : shouldShowCenterMiddle
      ? 'center-middle'
      : '';
    const bacgroundOpacityValue =
      currentDomain() === 'amazon.com' ||
      hideNotification ||
      fullPageModal ||
      this.state.hideOpacityBackground
        ? ''
        : hasFeature('notif_background_opacity_25')
        ? 'background-opacity-25'
        : hasFeature('notif_background_opacity_40')
        ? 'background-opacity-40'
        : '';
    const backgroundOpacityClass =
      bacgroundOpacityValue &&
      !hideNotification &&
      !fullPageModal &&
      !this.state.hideOpacityBackground
        ? `background-opacity-1${!showOnTop ? '-bottom' : ''}${showOnRight ? '-right' : ''}`
        : (bacgroundOpacityValue &&
            !hideNotification &&
            !fullPageModal &&
            this.state.hideOpacityBackground) ||
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
    const {roo, reportAProblem} = this.state;
    let {hideNotification} = this.state;
    const beforeRun = !this.state.running && !this.props.view.result;
    const showOnTop = !hasFeature('ext_sh_on_b');
    const showOnRight = true;
    const showOnRightOffset = hasFeature('n_or_1') && this.state.compNotifLoaded;
    const noScript = this.props.view.noScript;
    const isCashback = !!_.get(this.props, 'cashbackView.reward.amount');
    const vendor = _.get(this.props, 'vendorName', this.props.tld);
    const payoutProcessingPeriod = _.get(this.props, 'cashbackView.payoutProcessingPeriod', {});

    const shouldShowCenterMiddle = this.shouldShowCenterMiddle();
    const fullPageModal = this.shouldShowFullPage()
      ? `full-page ${!hasFeature('coupon_invite_friends') ? 'invite-friends-full' : ''}`
      : shouldShowCenterMiddle
      ? 'center-middle'
      : '';
    const hideRight =
      currentDomain() === 'amazon.com' &&
      (this.state.running || _.get(this.state.result, 'pageReload') || this.state.barComplete) &&
      !(_.get(this.props.deweyResult, 'pageType') === 'checkoutPage');
    const hideRightClass = beforeRun || hideRight ? 'hide-right' : '';
    const hasLinkedCard = _.get(this.props.events, 'hasLinkedCard');
    const reward = this.isRewardSite();
    const {bacgroundOpacityValue, backgroundOpacityClass} = this.determineBackgroundOpacity();
    const runAutomatically = !this.state.disableAutomatic && this.state.automaticCouponsEnabled;

    const {running, result, pageReload} = this.state;
    if (runAutomatically) {
      if (
        (!running && !result) ||
        running ||
        pageReload ||
        (currentDomain() === 'amazon.com' && result.savings <= 0)
      ) {
        hideNotification = true;
      }
    }

    return this.state.showThrottleToolTip ? (
      <div>
        <Motion
          style={{
            opacity: spring(this.state.hideThrottleToolTip ? 0 : 1, {stiffness: 180, damping: 20})
          }}>
          {({opacity}) => (
            <Tooltip
              tip={true}
              tipLabel={'wikibuy tip:'}
              message={<span>click the green "w." above if you want to try codes again.</span>}
              style={{
                top: showOnTop ? '15px' : 'auto',
                bottom: showOnTop ? 'auto' : '15px',
                width: '461px',
                left: showOnRight ? 'auto' : '15px',
                right: showOnRightOffset ? this.state.rightOffset : showOnRight ? '15px' : 'auto'
              }}
              innerStyle={{opacity: `${opacity}`}}
              onDismissTooltip={this.onDismissTooltip.bind(this)}
            />
          )}
        </Motion>
      </div>
    ) : (
      <div
        onClick={
          !hideNotification
            ? () => {
                this.setState({hideOpacityBackground: true});
              }
            : null
        }
        className={
          hideNotification
            ? `disabled coupon-page ${hideRightClass} ${
                this.state.resetNotification ? fullPageModal : ''
              } ${runAutomatically ? 'run-automatically' : ''}`
            : `coupon-page ${hideRightClass} ${
                runAutomatically
                  ? `run-automatically ${
                      this.state.showAutoCoupToolTip ? 'with-autocoup-tooltip' : ''
                    }`
                  : ''
              } ${fullPageModal} ${backgroundOpacityClass} ${bacgroundOpacityValue}`
        }
        style={{
          top: showOnTop ? '0' : 'auto',
          bottom: showOnTop ? 'auto' : '0',
          left: showOnRight ? 'auto' : '0',
          right: showOnRightOffset ? this.state.rightOffset : showOnRight ? '0' : 'auto'
        }}>
        <Motion
          style={{
            opacity: spring(hideNotification ? 0 : 1, {stiffness: 180, damping: 20}),
            y: spring(hideNotification ? (showOnTop ? -100 : 100) : 0, {
              stiffness: 180,
              damping: 20
            })
          }}>
          {({opacity, y}) => (
            <div
              className={`coupon-notification${currentDomain() === 'amazon.com' ? ' amazon' : ''}`}
              style={{
                transform: `translate3d(0,${y}%,0)`,
                opacity: `${opacity}`,
                width: `${hasFeature('coupon_lg_cta') ? '300px' : '284px'}`,
                minHeight: `${hasFeature('coupon_lg_cta') ? '496px' : 'none'}`,
                marginRight: `${hasFeature('coupon_lg_cta') ? '12px' : '20px'}`
              }}>
              <CouponHeader
                toggleAutomaticCouponSettings={this.toggleAutomaticCouponSettings.bind(this)}
                autoCouponSettings={this.state.autoCouponSettings}
                reportAProblem={() => this.setState({reportAProblem: !this.state.reportAProblem})}
                reportAProblemOpen={this.state.reportAProblem}
                view={this.props.view}
                running={this.state.running}
                roo={roo}
                fullPageModal={fullPageModal}
                onClosePopup={this.onClosePopup.bind(this)}
                runAutomatically={runAutomatically}
              />

              <section
                className="result-section-wrapper"
                onMouseMove={() => this.cancelAutoDismissCenterModal()}>
                {accountGateType ? (
                  <CreateAccountGate
                    session={this.props.session}
                    settings={this.props.settings}
                    accountGateType={accountGateType}
                    onSubmitAccountSuccess={this.onTryCodes.bind(this)}
                  />
                ) : noScript ? (
                  <NoScript
                    view={this.props.view}
                    reward={reward}
                    isCashback={isCashback}
                    postCoupons={_.get(this.props, 'cashbackView.postCoupons')}
                  />
                ) : runAutomatically ? (
                  <div>
                    {!this.state.running &&
                    this.state.showAutoCoupToolTip &&
                    this.state.result &&
                    this.state.result.savings > 0 ? (
                      <Tooltip
                        isAutoCoupMessage={true}
                        autoCoupToolTipDismissed={this.state.autoCoupToolTipDismissed}
                        message={<span>Don't want coupons applied automatically?</span>}
                        style={{
                          width: '250px',
                          left: '-265px'
                        }}
                        innerStyle={{opacity: `${opacity}`}}
                        onDismissTooltip={this.onDismissTooltip.bind(this, {type: 'autocoup'})}
                        onClosePopup={this.onClosePopup.bind(this)}
                      />
                    ) : null}
                    <AutoRenderResult
                      toggleAutomaticCouponSettings={this.toggleAutomaticCouponSettings.bind(this)}
                      autoCouponSettings={this.state.autoCouponSettings}
                      deweyResult={this.props.deweyResult}
                      exclusions={this.props.exclusions}
                      tld={this.props.tld}
                      reportAProblem={reportAProblem}
                      domain={currentDomain()}
                      reward={reward}
                      isCashback={isCashback}
                      postCoupons={_.get(this.props, 'cashbackView.postCoupons')}
                      settings={this.props.settings}
                      onTryCodes={this.onTryCodes.bind(this)}
                      onClosePopup={this.onClosePopup.bind(this)}
                      getRunAnimation={this.getRunAnimation.bind(this)}
                      view={this.props.view}
                      running={this.state.running}
                      barComplete={this.state.barComplete}
                      ctaLoading={this.state.ctaLoading}
                      didTryCodes={this.state.didTryCodes}
                      activateCredits={this.activateCreditsAfterAutomatic}
                      activatingCredits={this.state.activatingCredits}
                      creditsActivated={this.state.creditsActivated}
                    />
                  </div>
                ) : (
                  <RenderResult
                    deweyResult={this.props.deweyResult}
                    hasLinkedCard={hasLinkedCard}
                    exclusions={this.props.exclusions}
                    tld={this.props.tld}
                    storeContentApiData={this.state.storeContentApiData}
                    reportAProblem={reportAProblem}
                    hideRight={hideRight}
                    googleData={this.props.googleData}
                    domain={currentDomain()}
                    reward={reward}
                    postCoupons={_.get(this.props, 'cashbackView.postCoupons')}
                    fullPageModal={fullPageModal}
                    settings={this.state.settings}
                    shortCode={_.get(this.props, 'session.short_code')}
                    email={_.get(this.props, 'session.email')}
                    onTryCodes={this.determineTryCodes.bind(this)}
                    onClosePopup={this.onClosePopup.bind(this)}
                    autoDismissCenterModal={this.autoDismissCenterModal.bind(this)}
                    onToggleSubscribe={this.onToggleSubscribe.bind(this)}
                    getRunAnimation={this.getRunAnimation.bind(this)}
                    view={this.props.view}
                    running={this.state.running}
                    barComplete={this.state.barComplete}
                    ctaLoading={this.state.ctaLoading}
                    payoutProcessingPeriod={payoutProcessingPeriod}
                    vendor={vendor}
                  />
                )}
              </section>
            </div>
          )}
        </Motion>
      </div>
    );
  }

  toggleAutomaticCouponSettings() {
    if (!this.state.autoCouponSettings) {
      let ctaButtonText;
      try {
        ctaButtonText = document
          .querySelector('div[style="all: initial;"]')
          .shadowRoot.querySelector('.wbext-primary-btn-large').textContent;
      } catch (e) {
        // do nothing
      }
      sendMetric('trackClick', 'couponsModalClickConfig', 'settings-icon', {
        domain: currentDomain(),
        pagePath: location.pathname,
        currentSetting: _.get(
          this,
          'props.settings.notificationPreferences.automaticCouponsEnabled'
        ),
        runDuration: _.get(this, 'props.view.result.runTime'),
        savings: _.get(this, 'props.view.result.savings'),
        bestCoupon: _.get(this, 'props.view.result.bestCoupon.code'),
        coupons: _.get(this, 'props.view.result.coupons'),
        triggerType: 'auto',
        ctaText: ctaButtonText
      });
    }
    this.setState({autoCouponSettings: !this.state.autoCouponSettings});
  }

  determineTryCodes({disableAutomatic} = {}) {
    const hasFullAccount = isFullAccount();
    const fullCustomer = isFullCustomer();
    const type = !hasFullAccount ? 'noAccount' : !fullCustomer ? 'addName' : null;
    if (type && hasFeature('auth_gate_coupons')) {
      this.setState({accountGateType: type});
      dropCookie(uuid.v4().replace(/-/g, ''));
    } else {
      this.onTryCodes();
    }
  }

  shouldShowCenterMiddle() {
    return false; // NEVER CENTER ON COUPON
    // const orderTotal = _.get(this.props, 'deweyResult.pageData.order.total');
    // if (hasFeature('ext_cp_full_screen') && orderTotal > 7500) {
    if (hasFeature('ext_cp_full_screen')) {
      return true;
    }
  }

  shouldShowFullPage() {
    const runAutomatically = !this.state.disableAutomatic && this.state.automaticCouponsEnabled;
    if (runAutomatically) {
      return false;
    }
    return (
      (!this.state.barComplete &&
        !this.state.running &&
        _.get(this.state.result, 'savings', 0) > 0 &&
        (!this.state.qualified || (this.state.qualified && this.state.activated))) ||
      // this.state.roo && WE MAY ALWAYS WANT TO SHOW FULL
      this.state.running ||
      this.state.result ||
      _.get(this.props.view, 'forceTryCoupons')
    );
  }

  onDismissTooltip({type}) {
    if (type === 'autocoup') {
      this.setState({autoCoupToolTipDismissed: true});
      sendMetric('track', 'aCoupDismisTooltip', {
        domain: currentDomain(),
        pagePath: location.pathname
      });
    } else if (!this.state.tooltipDismissed) {
      // hideThrottleToolTip runs the fade animation
      this.setState({hideThrottleToolTip: true});
      this.setState({hideNotification: true});
      this.setState({tooltipDismissed: true});

      setSeenNotificationTooltip('hasSeenCouponsThrottleToolTip');

      setTimeout(() => {
        // wait a second for the fade animation, then remove the component altogether
        this.setState({showThrottleToolTip: false});
      }, 1000);
    }
  }

  onClosePopup(label, details = {}) {
    const {ctaText, fromTooltip, urlChange} = details;

    this.setState({hideNotification: true, resetNotification: true}, () => {
      this.timeout = setTimeout(() => {
        this.setState({resetNotification: false});
      }, 1000);
    });

    if (this.state.rooRunning) {
      cancelRoo();
    }
    if (!urlChange) {
      throttleNotification(this.state.didTryCodes);
    }

    const runAutomatically = !this.state.disableAutomatic && this.state.automaticCouponsEnabled;
    if (!this.state.didTryCodes || (runAutomatically && (label === 'x' || fromTooltip))) {
      sendMetric('trackClick', 'dismissCouponNotification', label, {
        domain: currentDomain(),
        pagePath: location.pathname,
        triggerType: runAutomatically ? 'auto' : null,
        savings: _.get(this, 'props.view.result.savings'),
        bestCoupon: _.get(this, 'props.view.result.bestCoupon.code'),
        coupons: _.get(this, 'props.view.result.coupons'),
        ctaText,
        runDuration: _.get(this, 'props.view.result.runTime')
      });
    }
  }

  async onToggleSubscribe() {
    const currentD = currentDomain();
    const subscriptions = this.state.settings.emailPreferences.coupons.domainSubscriptions;
    const subscribed = _.includes(subscriptions, currentD);
    let newSubscriptions;
    if (subscribed) {
      sendMetric('track', 'couponSubscribe', {
        domain: currentDomain(),
        pagePath: location.pathname,
        action: 'unsubscribed'
      });
      newSubscriptions = _.reject(subscriptions, d => d === currentD);
    } else {
      sendMetric('track', 'couponSubscribe', {
        domain: currentDomain(),
        pagePath: location.pathname,
        action: 'subscribed'
      });
      newSubscriptions = [...subscriptions, currentD];
    }
    this.setState({ctaLoading: true});
    const success = await updateEmailSubscriptions(newSubscriptions);
    this.setState({ctaLoading: false});
    if (success) {
      const newSettings = _.clone(this.state.settings);
      newSettings.emailPreferences.coupons.domainSubscriptions = newSubscriptions;
      this.setState({settings: newSettings});
    }
  }

  async determineShouldRespectSameTab() {
    let currentTabEnabledForPath = true;
    const deweyResultMeta = _.get(this, 'props.deweyResult.pageData.meta');
    if (
      deweyResultMeta &&
      _.find(deweyResultMeta, item => _.has(item, 'disable_aff_link_current_tab'))
    ) {
      currentTabEnabledForPath = false;
    }
    return currentTabEnabledForPath;
  }

  async onTryCodes(
    willEstimateRunTime,
    estimatedDuration,
    ignoreCancelled,
    disableAutomatic,
    disableCookieDrop,
    config = {}
  ) {
    const {fromAutoRun} = config;
    let {clickId, couponRunId} = config;

    const isCashback = !!_.get(this.props, 'cashbackView.reward.amount');

    couponRunId = couponRunId || uuid.v4();
    clickId = clickId || sessionStorage.getItem('__wb_clickId') || generateClickId();

    const isSiteHub = tree.get('couponNotif') === 'siteHub';
    const autoCoupTryCount = _.get(this, 'props.view.autoCoupConfig.codeCount') || 2; // update in both places
    const couponTryCount = this.state.automaticCouponsEnabled ? autoCoupTryCount : null;
    const reward =
      _.get(this.props, 'cashbackView.reward') && !_.get(this.props, 'view.disableCreditsOverride')
        ? _.get(this.props, 'cashbackView.reward')
        : false;
    const postCoupons = _.get(this.props.cashbackView, 'postCoupons');
    let activateCredits = false;
    if (reward && reward.amount && !postCoupons) {
      activateCredits = true;
    }

    const currentTabEnabledForPath = await this.determineShouldRespectSameTab();

    if (
      currentTabEnabledForPath &&
      this.state.redirectInCurrentTab &&
      (activateCredits || !this.props.view.disableAffiliate) &&
      !disableCookieDrop
    ) {
      activateInCurrentTab(activateCredits, {clickId, fromAutoRun});
      return;
    }

    this.setState({
      didTryCodes: true,
      running: true,
      rooRunning: !!this.props.view.roo,
      accountGateType: false,
      disableAutomatic: disableAutomatic === true
    });
    let tryCodes;
    const isRoo = Boolean(this.props.view.roo);
    if (isRoo) {
      tryCodes = tryRoo;
    } else {
      tryCodes = tryTigger;
    }
    const runAnimation = this.getRunAnimation(willEstimateRunTime, estimatedDuration);
    if (!this.state.automaticCouponsEnabled) {
      const redirectId = dashUuid(clickId);
      sendMetric('trackClick', 'tryCodesButton', 'try codes', {
        domain: currentDomain(),
        pagePath: location.pathname,
        clickId,
        couponRunId,
        redirectId,
        cashback: isCashback
      });
    }

    Bluebird.all([
      tryCodes({
        ignoreCancelled,
        disableAffiliate: disableCookieDrop || activateCredits || this.props.view.disableAffiliate,
        couponTryCount,
        automaticCouponsRun: !this.state.disableAutomatic && this.state.automaticCouponsEnabled,
        autoFallback: fromAutoRun,
        isSiteHub,
        passedInClickId: clickId,
        couponRunId,
        cashback: isCashback
      }),
      activateCredits && !disableCookieDrop
        ? activateThroughPinnedTab({clickId, coupons: true, fromAutoRun})
        : Bluebird.resolve(),
      isRoo ? Bluebird.resolve().delay(runAnimation.duration) : Bluebird.resolve()
    ]).then(([codesResp, cashbackResp, animationResp]) => {
      if (cashbackResp) {
        sendMetric('track', 'activateCashbackRedirect', {
          domain: currentDomain(),
          pagePath: location.pathname,
          rewardAmount: reward.amount,
          rewardDisplay: reward.type
        });
      }

      sessionStorage.removeItem('__wb_clickId');

      const extendTimeout =
        _.get(codesResp, 'finishWithoutResult') ||
        _.get(codesResp, 'pageReload') ||
        _.get(codesResp, 'changePageLocation'); // HACK FOR WHEN RESULT HASNT COME THROUGH YET BUT STILL WAITING. STOP NOTIFICAtiON FROM SHOWING ORIGINAL STATE.
      setTimeout(
        () => {
          // Allow props for the result to come down.
          this.setState({running: false, barComplete: true, rooRunning: false}, () => {
            setTimeout(() => this.setState({barComplete: false}), 300);
          });
        },
        extendTimeout ? 2400 : 200
      );
    });
  }

  async activateCreditsAfterAutomatic({clickId, fromAutoRun, savings} = {}) {
    const currentTabEnabledForPath = await this.determineShouldRespectSameTab();
    const postCoupons = _.get(this.props.cashbackView, 'postCoupons');
    this.setState({
      creditsActivated: true
    });
    if (this.state.redirectInCurrentTab && currentTabEnabledForPath) {
      // TODO: respect current tab path logic
      const autoSavings = savings;
      await activateInCurrentTab(!postCoupons, {clickId, fromAutoRun, autoSavings});
    } else {
      await activateThroughPinnedTab({clickId, coupons: true, fromAutoRun});
    }
  }

  getRunAnimation(willEstimateRunTime) {
    const {roo, estimatedRunTime} = this.props.view;
    // Allow for run time to be calculated by the DOM events the tigger script is emmiting,
    // or from the props

    let runAnimation;

    if (roo) {
      runAnimation = {duration: 0, stagger: 0};
    } else if (willEstimateRunTime) {
      runAnimation = {class: 'extra-extra-slow', stagger: 2000, duration: 80000};
    } else {
      if (estimatedRunTime <= 5000) {
        runAnimation = {class: 'fast', stagger: 500, duration: 5500};
      } else if (estimatedRunTime <= 10000) {
        runAnimation = {class: 'medium', stagger: 1000, duration: 10500};
      } else if (estimatedRunTime <= 15000) {
        runAnimation = {class: 'slow', stagger: 1500, duration: 15500};
      } else if (estimatedRunTime <= 20000) {
        runAnimation = {class: 'extra-slow', stagger: 2000, duration: 20500};
      } else {
        runAnimation = {class: 'extra-extra-slow', stagger: 2500, duration: 25500};
      }
    }
    return runAnimation;
  }

  closeModalOnClickOutside(e) {
    const runAutomatically = !this.state.disableAutomatic && this.state.automaticCouponsEnabled;
    const path = e.path || (e.nativeEvent.composedPath && e.nativeEvent.composedPath());
    const clickWasOutside = !_.find(
      path,
      el => el.className && el.className.includes('wbext-coupon-notification')
    );
    if (
      clickWasOutside &&
      e.isTrusted &&
      !this.state.hideNotification &&
      (this.shouldShowFullPage() || runAutomatically)
    ) {
      const shouldDismiss = !this.state.running && !!this.state.result && !runAutomatically;
      if (shouldDismiss) this.onClosePopup();
    }
  }

  sendCouponNotificationEvent(opacityNotification, runAutomatically, isSiteHub) {
    const couponResult = _.get(this, 'state.result');
    const couponRunId = _.get(couponResult, 'couponRunId');
    const triggerType = _.get(couponResult, 'automaticCouponsRun')
      ? 'auto'
      : _.get(couponResult, 'autoFallback')
      ? 'auto_fallback'
      : _.get(couponResult, 'isSiteHub') || isSiteHub
      ? 'site_hub'
      : null;
    const eventName = this.state.result ? 'couponNotificationResult' : 'couponNotification';
    sendMetric('page', eventName, {
      view: eventName,
      type: 'notification',
      domain: currentDomain(),
      pagePath: location.pathname,
      cashback: !!_.get(this.props, 'cashbackView.reward.amount'),
      cashbackAmount: _.get(this.props, 'cashbackView.reward.amount'),
      cashbackType: _.get(this.props, 'cashbackView.reward.type'),
      vendorMetaId: _.get(this.props, 'cashbackView.id'),
      opacityNotification: !!opacityNotification,
      triggerType,
      couponRunId,
      engine: tree.get(['siteAPIData', 'siteData', 'coupons', 'type'])
    });
  }

  autoDismissCenterModal() {
    const reward = this.isRewardSite();
    const delayTime = reward ? 7000 : 5000;
    selfDismiss = setTimeout(() => this.onClosePopup(), delayTime);
  }

  cancelAutoDismissCenterModal() {
    if (!this.state.running && this.state.result) {
      clearTimeout(selfDismiss);
    }
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    if (tree.get('couponNotif')) {
      tree.unset('couponNotif');
    }

    window.removeEventListener('click', this.boundCloseModal);
  }
}

export default branch(
  {
    view: ['couponView'],
    deweyResult: ['deweyResult'],
    cashbackView: ['cashbackView'],
    exclusions: ['siteAPIData', 'siteData', 'merchantPage', 'exclusions'],
    tld: ['siteAPIData', 'meta', 'domain'],
    vendorName: ['siteAPIData', 'meta', 'name'],
    giftCardView: ['giftCardView'],
    session: ['session'],
    settings: ['settings'],
    googleData: ['googleData'],
    events: ['events'],
    notificationBackgroundOpacity: ['notificationBackgroundOpacity'],
    shouldHidePrompt: ['shouldHidePrompt'],
    shouldShowSPAPrompt: ['shouldShowSPAPrompt']
  },
  Coupon
);
