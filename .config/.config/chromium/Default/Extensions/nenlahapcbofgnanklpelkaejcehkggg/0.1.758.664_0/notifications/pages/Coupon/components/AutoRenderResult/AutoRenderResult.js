import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import sendMetric from 'utility/sendMetric';
import NoSavingsAvailable from './components/NoSavingsAvailable';
import CallToAction from './components/CallToAction';
import SavingsAvailable from './components/SavingsAvailable';
import currency from 'utility/currency';
import formatCurrency from 'utility/formatCurrency';
import ProgressBar from 'components/ProgressBar';
import RooProgressBar from 'components/RooProgressBar';
import PartnerLogo from 'components/PartnerLogo';
import PageProduceImage from 'components/PageProduceImage';
import currentDomain from 'utility/currentDomain';
import hasFeature from 'utility/hasFeature';
import {viewAllCodes} from 'actions/couponActions';
import AutomaticCouponSettings from './components/AutomaticCouponSettings';
import './auto-render-result.less';

class AutoRenderResult extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      viewCodes: false,
      estimatedTimeLeft: null,
      willEstimateDuration: false
    };
    this.onInitTryCoupons = () => {
      this.setState({willEstimateDuration: true});
    };
    this.onEstimatedCouponDuration = ({detail}) => {
      this.setState({estimatedTimeLeft: detail.estimatedTimeLeft});
    };
  }

  componentDidMount() {
    // This will slow down the progress bar
    document.addEventListener('__iv_init_try_coupons', this.onInitTryCoupons);
    document.addEventListener('__iv_estimated_coupon_try_duration', this.onEstimatedCouponDuration);
    if (!this.props.didTryCodes && !this.props.running) {
      this.props.onTryCodes(null, null, true, false, true);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('__iv_init_try_coupons', this.onInitTryCoupons);
    document.removeEventListener(
      '__iv_estimated_coupon_try_duration',
      this.onEstimatedCouponDuration
    );
  }

  render() {
    const {
      coupons,
      result,
      couponCount,
      estimatedRunTime,
      currentCouponCode,
      runTimePerCoupon,
      roo
    } = this.props.view;
    const {
      running,
      barComplete,
      reward,
      postCoupons,
      pause,
      didTryCodes,
      onTryCodes,
      activateCredits,
      settings,
      activatingCredits,
      creditsActivated,
      autoCouponSettings,
      isCashback
    } = this.props;
    const pageReload = _.get(result, 'pageReload');
    const originalTotal = _.get(result, 'originalTotal');
    const workingCoupons = _.filter(
      _.get(result, 'coupons'),
      c => c.savings > 0 || c.generatedFreeGift || c.generatedFreeShipping
    );
    const savings = result && result.savings && result.savings > 0 ? currency(result.savings) : 0;
    const isBonkersSavings = _.get(result, 'savings') > 1000000; // $10,000
    const bestCode = _.get(result, 'bestCoupon.code');
    const runTimeSeconds = (_.get(result, 'runTime', 0) / 1000).toFixed(2);
    let resultCoupons = _(coupons)
      .take(couponCount)
      .map((coupon, i) => {
        coupon.success = true;
        return coupon;
      })
      .value();

    let currentCodeIndex;
    if (roo && !result) {
      currentCodeIndex = _.findIndex(resultCoupons, coupon => coupon.code === currentCouponCode);
      resultCoupons = _.map(resultCoupons, (coupon, i) => {
        if (i < currentCodeIndex) {
          coupon.success = true;
        } else {
          coupon.success = false;
        }
        return coupon;
      });
    }

    const barIsComplete = barComplete && !pause;
    const showProgressBar = running || pageReload || barIsComplete;
    const noSavingsAvailable = result && (!bestCode || !savings) && !running;
    const renderPostResultCtaInUi = !barIsComplete && !running && result && !pause;
    const requiresInput = result && result.requiresInput;
    const exclusions = this.props.exclusions;
    const tld = this.props.tld;

    const estimatedDuration = this.state.willEstimateDuration
      ? 80000
      : this.props.view.estimatedRunTime;
    const showReward = reward && reward.amount && !postCoupons;
    const rawSavings = _.get(result, 'savings');
    const couponsFromResult = _.get(result, 'coupons');

    const autoCoupTryCount = _.get(this, 'props.view.autoCoupConfig.codeCount') || 2; // update in both places
    const autoCoupTryMoreCount = couponCount - Math.min(couponCount, autoCoupTryCount);
    const runDuration = _.get(this, 'props.view.result.runTime');
    const showRunning = (!running && !result) || running || pageReload;
    return (
      <div
        className={`auto-render-result render-result-layout invite-test-layout auto large-notif`}>
        <div className="left full">
          <div
            className={`result-column ${
              _.get(this.props.googleData, 'contacts.length') ? 'has-contacts' : ''
            }`}>
            {(showProgressBar || pause) && running ? (
              <div className="try-codes-wrapper auto">
                <div className="trying-codes-active">
                  <PartnerLogo
                    useImgTag={true}
                    type="cropped"
                    domain={currentDomain()}
                    cursor={hasFeature('ext_cnc_point_show') ? 'pointer' : 'auto'}
                    autocoup
                  />
                  <h2 style={{padding: '35px 0 10px'}}>Testing the best codes automatically!</h2>
                  <div className="progress-bar">
                    {roo ? (
                      <RooProgressBar
                        estimatedDuration={estimatedRunTime}
                        complete={barIsComplete}
                        currentCodeIndex={currentCodeIndex}
                        coupons={coupons}
                        runTimePerCoupon={runTimePerCoupon}
                      />
                    ) : (
                      <ProgressBar
                        pause={this.props.pause}
                        estimatedDuration={estimatedDuration}
                        complete={barIsComplete}
                        estimatedTimeLeft={this.state.estimatedTimeLeft}
                      />
                    )}
                  </div>
                  {currentCodeIndex > -1 ? (
                    <h5 style={{textAlign: 'center', marginTop: 15}} className="bold">
                      Trying {currentCodeIndex + 1} of {couponCount} Codes
                    </h5>
                  ) : null}
                </div>
              </div>
            ) : showRunning ? (
              <div
                onClick={e => {
                  if (hasFeature('ext_cnc_point_show')) {
                    this.props.onTryCodes();
                  }
                }}
                style={{cursor: hasFeature('ext_cnc_point_show') ? 'pointer' : 'auto'}}>
                <div className="found-codes">
                  {hasFeature('ext_coupon_product_img') ? (
                    <PageProduceImage
                      notificationType="coupon"
                      deweyResult={this.props.deweyResult}
                      domain={currentDomain()}
                      cursor={'auto'}
                    />
                  ) : hasFeature('coupon_lg_cta') ? (
                    <div className="icon-credit" />
                  ) : hasFeature('ext_cnc_img_logo') && currentDomain() !== 'amazon.com' ? (
                    <PartnerLogo
                      type="cropped"
                      domain={currentDomain()}
                      cursor={hasFeature('ext_cnc_point_show') ? 'pointer' : 'auto'}
                    />
                  ) : null}
                  {hasFeature('coupon_lg_cta') ? (
                    <h2>
                      <span>
                        Found {couponCount} {couponCount === 1 ? 'code' : 'codes'}
                      </span>
                      {showReward ? (
                        <span>
                          {' '}
                          <br /> and get {reward.categories ? 'up to ' : ''}
                          <span className="palmetto">
                            {reward.type === 'percentage'
                              ? `${reward.amount / 100}% back`
                              : `${formatCurrency(reward.amount)} in credit`}
                          </span>
                        </span>
                      ) : null}
                    </h2>
                  ) : (
                    <h2>
                      <span>
                        Found {couponCount} {couponCount === 1 ? 'code' : 'codes'}
                      </span>
                      {showReward ? (
                        <span>
                          {' '}
                          and <br />
                          get {reward.categories ? 'up to ' : ''}
                          <span className="palmetto">
                            {reward.type === 'percentage'
                              ? `${reward.amount / 100}% back`
                              : `${formatCurrency(reward.amount)} in credit`}
                          </span>
                        </span>
                      ) : null}
                    </h2>
                  )}
                  <h4 className="bold">Wikibuy tests codes in seconds.</h4>
                </div>
              </div>
            ) : noSavingsAvailable || autoCoupTryMoreCount < 0 ? (
              <NoSavingsAvailable
                {...{
                  exclusions,
                  tld,
                  runTimeSeconds,
                  couponCount,
                  roo,
                  reward,
                  isCashback,
                  postCoupons,
                  requiresInput,
                  didTryCodes,
                  running,
                  onTryCodes,
                  rawSavings,
                  bestCode,
                  couponsFromResult,
                  autoCoupTryMoreCount,
                  activateCredits,
                  activatingCredits,
                  creditsActivated,
                  runDuration
                }}
                onClosePopup={this.props.onClosePopup.bind(this)}
              />
            ) : (
              <SavingsAvailable
                {...{
                  exclusions,
                  tld,
                  runTimeSeconds,
                  couponCount,
                  savings,
                  reward,
                  isCashback,
                  postCoupons,
                  originalTotal,
                  workingCoupons,
                  requiresInput,
                  didTryCodes,
                  running,
                  onTryCodes,
                  activateCredits,
                  rawSavings,
                  bestCode,
                  couponsFromResult,
                  activatingCredits,
                  creditsActivated,
                  autoCoupTryMoreCount,
                  runDuration,
                  autoCouponSettings,
                  isBonkersSavings
                }}
                demo={this.props.demo}
                onClosePopup={this.props.onClosePopup.bind(this)}
              />
            )}

            <CallToAction
              domain={this.props.domain}
              onTryCodes={this.props.onTryCodes.bind(this)}
              onClosePopup={this.props.onClosePopup.bind(this)}
              renderPostResultCtaInUi={renderPostResultCtaInUi}
              loading={this.props.ctaLoading}
              settings={this.props.settings}
              roo={roo}
              {...{running, result, couponCount, pageReload, savings}}
            />

            {this.props.autoCouponSettings ? (
              <AutomaticCouponSettings
                onClose={this.props.toggleAutomaticCouponSettings}
                settings={settings}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  onTryCodes(skippedSignup) {
    this.setState({viewCodes: false});
    this.props.onTryCodes(skippedSignup);
  }

  onClickViewCode() {
    sendMetric('trackClick', 'toggleCodes', !this.state.viewCodes ? 'view codes' : 'hide codes', {
      domain: this.props.domain,
      pagePath: location.pathname
    });
    if (!this.state.viewCodes) {
      viewAllCodes();
    }
    this.setState({viewCodes: !this.state.viewCodes});
  }
}

export default AutoRenderResult;
