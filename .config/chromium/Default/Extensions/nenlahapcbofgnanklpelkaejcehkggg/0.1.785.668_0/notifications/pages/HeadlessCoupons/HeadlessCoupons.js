import {React} from 'utility/css-ns';
import {Component} from 'react';
import {Motion, spring} from 'react-motion';
import {branch} from 'higher-order/baobab';
import sendMetric from 'utility/sendMetric';
import _ from 'lodash';
import getCurrentCouponRunState from 'messenger/outbound/getCurrentCouponRunState';
import tree from 'state';
import ProgressBar from 'components/ProgressBar';
import SavingsAvailable from './components/SavingsAvailable';
import NoSavingsAvailable from './components/NoSavingsAvailable';
import ReviewWikibuy from './components/ReviewWikibuy';
import CouponList from './components/CouponList';
import './headless-coupons.less';

const savingsCtaText = 'Finalize Savings';
const noSavingsCtaText = 'Continue to Checkout';

class HeadlessCoupons extends Component {
  state = {};

  constructor(...args) {
    super(...args);
    const cursor = tree.select('couponView');
    this.state = {
      hideNotification: true,
      disableAffiliate: cursor.get('disableAffiliate')
    };
    this.ctaClickLogger = this.ctaClickLogger.bind(this);
  }

  componentDidMount() {
    const runHasFinished = _.get(this.props, 'currentCouponRun.running') === false;
    sendMetric('page', 'robocoupDisplayModal', {
      view: 'robocoupDisplayModal',
      type: 'notification',
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname,
      robocoupRunId: _.get(this.props, 'currentCouponRun.runId'),
      runHasFinished
    });
    if (runHasFinished) {
      const hasSavings = _.get(this.props, 'currentCouponRun.couponResult.savings') > 0;
      sendMetric('track', 'robocoupResultModal', {
        domain: location.hostname.replace(/^www\./, ''),
        pagePath: location.pathname,
        savings: _.get(this.props, 'currentCouponRun.couponResult.savings'),
        coupons: _.get(this.props, 'currentCouponRun.couponResult.offers'),
        bestCoupon: _.get(this.props, 'currentCouponRun.couponResult.bestCoupon.code'),
        robocoupRunId: _.get(this.props, 'currentCouponRun.runId'),
        ctaText: hasSavings ? savingsCtaText : noSavingsCtaText,
        waitTimeMs: 0
      });
    }
    const mountTimeUnix = Date.now();
    setTimeout(() => {
      this.setState({hideNotification: false, mountTimeUnix});
    }, 1000);
    if (_.get(this.props, 'currentCouponRun.running')) {
      this.timeoutId = setInterval(async () => {
        if (_.get(this.props, 'currentCouponRun.running')) {
          const state = await getCurrentCouponRunState(
            _.get(this.props.siteData, 'siteData.coupons.tld')
          );
          tree.set('currentCouponRun', state);
        }
      }, 1000);
    }
  }
  componentWillUnmount() {
    if (this.timeoutId) {
      clearInterval(this.timeoutId);
    }
    if (this.completingTimeout) {
      clearInterval(this.completingTimeout);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (
      _.get(this.props, 'currentCouponRun.running') &&
      _.get(nextProps, 'currentCouponRun.running') === false
    ) {
      const hasSavings = _.get(nextProps, 'currentCouponRun.couponResult.savings') > 0;
      const mountTimeUnix = _.get(this, 'state.mountTimeUnix');
      const waitTimeMs = mountTimeUnix ? Date.now() - mountTimeUnix : null;
      this.setState({runCompleting: true, runFinshedAtCheckout: true}, () => {
        this.completingTimeout = setTimeout(() => {
          sendMetric('track', 'robocoupResultModal', {
            domain: location.hostname.replace(/^www\./, ''),
            pagePath: location.pathname,
            savings: _.get(nextProps, 'currentCouponRun.couponResult.savings'),
            coupons: _.get(nextProps, 'currentCouponRun.couponResult.offers'),
            bestCoupon: _.get(this.props, 'currentCouponRun.couponResult.bestCoupon.code'),
            robocoupRunId: _.get(nextProps, 'currentCouponRun.runId'),
            ctaText: hasSavings ? savingsCtaText : noSavingsCtaText,
            waitTimeMs
          });
          this.setState({runCompleting: false});
        }, 1000);
      });
    }
  }

  render() {
    const {hideNotification} = this.state;
    const showOnTop = true;
    const showOnRight = true;
    const currentCouponRun = this.props.currentCouponRun;
    const isRunning = _.get(currentCouponRun, 'running');
    const isComplete = !!_.get(currentCouponRun, 'couponResult');
    const hasSavings = _.get(currentCouponRun, 'couponResult.savings') > 0;
    const coupons = _.get(currentCouponRun, 'coupons');
    const couponCount = _.get(currentCouponRun, 'coupons.length');
    const triedCouponsLength = _.get(currentCouponRun, 'triedCoupons.length') || 1;
    const useTriedCoupons = _.get(currentCouponRun, 'triedCoupons.length') > 0 ? true : false;
    const workingCoupons = _.filter(
      useTriedCoupons
        ? _.get(currentCouponRun, 'triedCoupons')
        : _.get(currentCouponRun, 'couponResult.offers', []),
      coupon => coupon.savings > 0
    );
    const estimatedTimeLeft =
      triedCouponsLength && triedCouponsLength === couponCount ? 2000 : null;
    const estimatedRunTime = 30000;
    const runTimePerCoupon = 2000;
    if (!currentCouponRun) {
      return null;
    }
    return (
      <div
        className={
          hideNotification ? 'disabled headless-coupons-page' : 'headless-coupons-page full-page'
        }
        style={{
          top: showOnTop ? '0' : 'auto',
          bottom: showOnTop ? 'auto' : '0',
          left: showOnRight ? 'auto' : '0',
          right: showOnRight ? '0' : 'auto'
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
              className="headless-coupons-notification"
              style={{
                transform: `translate3d(0,${y}%,0)`,
                opacity: `${opacity}`
              }}>
              <header>
                <div className="w-icon-logo" style={{height: '40px', width: '60px'}}>
                  {this.renderWIcon()}
                </div>
                {!isRunning ? (
                  <div className="close icon-x" onClick={this.onClosePopup.bind(this, 'x')} />
                ) : null}
              </header>
              <div className="render-result-layout">
                <div className="left">
                  {isRunning || this.state.runCompleting ? (
                    <div className="try-codes-wrapper">
                      <div>
                        <h2>Trying Coupon Codes</h2>
                        <h5 className="silver">
                          Wikibuy automatically tries the best coupon codes to save you money.
                        </h5>
                        <div className="progress-bar">
                          <ProgressBar
                            pause={false}
                            estimatedDuration={estimatedRunTime}
                            complete={this.state.runCompleting}
                            estimatedTimeLeft={estimatedTimeLeft}
                          />
                        </div>
                        {triedCouponsLength > 0 ? (
                          <h5 style={{textAlign: 'center', marginTop: 15}} className="bold">
                            Trying {triedCouponsLength} of {couponCount} Codes
                          </h5>
                        ) : (
                          <h5 style={{height: '20px'}} />
                        )}
                      </div>
                    </div>
                  ) : hasSavings ? (
                    <SavingsAvailable
                      workingCoupons={workingCoupons}
                      couponCount={couponCount}
                      savings={_.get(currentCouponRun, 'couponResult.savings')}
                      onClosePopup={this.onClosePopup.bind(this)}
                      runFinshedAtCheckout={this.state.runFinshedAtCheckout}
                      ctaText={savingsCtaText}
                      ctaClickLogger={this.ctaClickLogger}
                      disableAffiliate={this.state.disableAffiliate}
                    />
                  ) : (
                    <NoSavingsAvailable
                      codes={coupons}
                      couponCount={couponCount}
                      onClosePopup={this.onClosePopup.bind(this)}
                      runFinshedAtCheckout={this.state.runFinshedAtCheckout}
                      ctaText={noSavingsCtaText}
                      ctaClickLogger={this.ctaClickLogger}
                      disableAffiliate={this.state.disableAffiliate}
                    />
                  )}
                </div>
                <div className="right">
                  {isRunning ? (
                    <CouponList
                      currentCodeIndex={triedCouponsLength - 1}
                      coupons={coupons}
                      runTimePerCoupon={runTimePerCoupon}
                      estimatedRunTime={estimatedRunTime}
                    />
                  ) : (
                    <ReviewWikibuy
                      onClosePopup={this.onClosePopup.bind(this)}
                      savings={_.get(currentCouponRun, 'couponResult.savings')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </Motion>
      </div>
    );
  }

  onClosePopup(label) {
    this.setState({hideNotification: true});
    const hasSavings = _.get(this.props, 'currentCouponRun.couponResult.savings') > 0;
    if (label === 'x') {
      sendMetric('trackClick', 'robocoupDismissModal', label, {
        domain: location.hostname.replace(/^www\./, ''),
        pagePath: location.pathname,
        savings: _.get(this.props, 'currentCouponRun.couponResult.savings'),
        coupons: _.get(this.props, 'currentCouponRun.couponResult.offers'),
        bestCoupon: _.get(this.props, 'currentCouponRun.couponResult.bestCoupon.code'),
        robocoupRunId: _.get(this.props, 'currentCouponRun.runId'),
        ctaText: hasSavings ? savingsCtaText : noSavingsCtaText
      });
      if (_.get(this, 'props.currentCouponRun.couponResult.savings') > 0) {
        setTimeout(() => window.location.reload(), 10);
      }
    }
  }

  ctaClickLogger(text) {
    sendMetric('trackClick', 'robocoupClickCta', text, {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname,
      savings: _.get(this.props, 'currentCouponRun.couponResult.savings'),
      coupons: _.get(this.props, 'currentCouponRun.couponResult.offers'),
      bestCoupon: _.get(this.props, 'currentCouponRun.couponResult.bestCoupon.code'),
      robocoupRunId: _.get(this.props, 'currentCouponRun.runId'),
      ctaText: text
    });
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
}

export default branch(
  {
    session: ['session'],
    currentCouponRun: ['currentCouponRun'],
    siteData: ['siteData']
  },
  HeadlessCoupons
);
