import {React} from 'utility/css-ns';
import {Component} from 'react';
import CouponList from '../RenderResult/components/CouponList';
import _ from 'lodash';
import sendMetric from 'utility/sendMetric';
import NoSavingsAvailable from './components/NoSavingsAvailable';
import ReviewWikibuy from './components/ReviewWikibuy';
import CreditActivated from './components/CreditActivated';
import LinkCardPrompt from './components/LinkCardPrompt';
import CheckCouponWork from './components/CheckCouponWork';
import InviteTest from './components/InviteFriends/InviteTest';
import CallToAction from './components/CallToAction';
import SavingsAvailable from './components/SavingsAvailable';
import CouponListForRunning from './components/CouponList/CouponListForRunning';
import CashBackCategories from 'components/CashBackCategories/CashBackCategories';
import StoreContentData from 'components/StoreContentData/StoreContentData';
import currency from 'utility/currency';
import ProgressBar from 'components/ProgressBar/ProgressBar';
import ProgressBarV2 from 'components/ProgressBar/ProgressBarV2';
import RooProgressBar from 'components/RooProgressBar';
import PartnerLogo from 'components/PartnerLogo';
import PageProduceImage from 'components/PageProduceImage';
import currentDomain from 'utility/currentDomain';
import hasFeature from 'utility/hasFeature';
import formatCurrency from 'utility/formatCurrency';
import {viewAllCodes} from 'actions/couponActions';

import ReportAProblem from 'components/ReportAProblem';

class RenderResult extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      viewCodes: false,
      estimatedTimeLeft: null,
      willEstimateDuration: false,
      currentCodeIndexTigger: 0,
      couponQtTigger: null
    };
    this.onInitTryCoupons = () => {
      this.setState({willEstimateDuration: true});
    };
    this.onEstimatedCouponDuration = ({detail}) => {
      this.setState({
        estimatedTimeLeft: detail.estimatedTimeLeft,
        currentCodeIndexTigger: detail.currentCodeIndex,
        couponQtTigger: detail.couponQt
      });
    };
  }

  componentDidMount() {
    // This will slow down the progress bar
    document.addEventListener('__iv_init_try_coupons', this.onInitTryCoupons);
    document.addEventListener('__iv_estimated_coupon_try_duration', this.onEstimatedCouponDuration);
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
      pageWasReloaded,
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
      activateCredits,
      vendor,
      payoutProcessingPeriod
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
    const runAnimation = this.props.getRunAnimation(this.state.willEstimateDuration);
    const showProgressBar = running || pageReload || barIsComplete;
    const noSavingsAvailable = result && (!bestCode || !savings) && !running;
    const renderPostResultCtaInUi = !barIsComplete && !running && result && !pause;
    const inviteFriends =
      hasFeature('notif_invite_friends') || hasFeature('notif_invite_friends_link');
    const requiresInput = result && result.requiresInput;
    const hideRight = this.props.hideRight;
    const exclusions = this.props.exclusions;
    const tld = this.props.tld;

    const estimatedDuration = this.state.willEstimateDuration
      ? 80000
      : this.props.view.estimatedRunTime;
    const showReward = reward && reward.amount && !postCoupons;
    const {currentCodeIndexTigger, couponQtTigger} = this.state;

    return (
      <div
        className={`render-result-layout invite-test-layout ${
          hasFeature('coupon_lg_cta') ? 'large-notif' : ''
        }`}>
        <div className="left">
          <div
            className={`result-column ${
              _.get(this.props.googleData, 'contacts.length') ? 'has-contacts' : ''
            }`}>
            {showProgressBar || pause ? (
              <div className="try-codes-wrapper">
                <div>
                  <h2>Trying Coupon Codes</h2>
                  <h5 className="silver">
                    Wikibuy automatically tries the best coupon codes to save you money.
                  </h5>
                  <div className="progress-bar">
                    {roo ? (
                      <RooProgressBar
                        estimatedDuration={estimatedRunTime}
                        complete={barIsComplete}
                        currentCodeIndex={currentCodeIndex}
                        coupons={coupons}
                        runTimePerCoupon={runTimePerCoupon}
                      />
                    ) : hasFeature('progress_bar_v2') ? (
                      <ProgressBarV2
                        pause={this.props.pause}
                        complete={barIsComplete}
                        currentCodeIndexTigger={currentCodeIndexTigger}
                        couponQtTigger={couponQtTigger}
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
                  ) : (
                    <h5 style={{height: '20px'}} />
                  )}
                </div>
              </div>
            ) : (!running && !result) || running || pageReload || barIsComplete ? (
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
            ) : noSavingsAvailable ? (
              reward.categories && !requiresInput ? (
                <CreditActivated
                  reward={reward}
                  payoutProcessingPeriod={payoutProcessingPeriod}
                  exclusions={exclusions}
                  tld={tld}
                  showDismiss
                  noSavingsAvailable
                  vendor={vendor}
                  couponCount={couponCount}
                  onClosePopup={this.props.onClosePopup.bind(this)}
                  autoDismissCenterModal={this.props.autoDismissCenterModal.bind(this)}
                />
              ) : (
                <NoSavingsAvailable
                  {...{
                    exclusions,
                    tld,
                    runTimeSeconds,
                    couponCount,
                    roo,
                    reward,
                    postCoupons,
                    requiresInput,
                    activateCredits,
                    workingCoupons,
                    vendor
                  }}
                  codes={_.get(result, 'coupons')}
                  onClosePopup={this.props.onClosePopup.bind(this)}
                  autoDismissCenterModal={this.props.autoDismissCenterModal.bind(this)}
                />
              )
            ) : (
              <SavingsAvailable
                {...{
                  exclusions,
                  tld,
                  runTimeSeconds,
                  couponCount,
                  savings,
                  reward,
                  postCoupons,
                  workingCoupons,
                  requiresInput,
                  isBonkersSavings
                }}
                demo={this.props.demo}
                hideBorder={reward.categories}
                onClosePopup={this.props.onClosePopup.bind(this)}
                autoDismissCenterModal={this.props.autoDismissCenterModal.bind(this)}
              />
            )}

            <CallToAction
              domain={this.props.domain}
              onTryCodes={this.props.onTryCodes.bind(this)}
              onClosePopup={this.props.onClosePopup.bind(this)}
              onToggleSubscribe={this.props.onToggleSubscribe.bind(this)}
              renderViewCodes={this.renderViewCodes.bind(this)}
              renderPostResultCtaInUi={renderPostResultCtaInUi}
              loading={this.props.ctaLoading}
              settings={this.props.settings}
              roo={roo}
              {...{running, result, couponCount, pageReload, savings}}
            />
          </div>
        </div>
        {!hideRight ? (
          <div className="right">
            {showProgressBar || pause ? (
              <div className="run-codes">
                <CouponListForRunning
                  pause={pause}
                  runTimePerCoupon={runTimePerCoupon}
                  currentCodeIndex={currentCodeIndex}
                  estimatedRunTime={estimatedRunTime}
                  roo={roo}
                  disableChecks={true}
                  show={running || result}
                  result={result}
                  running={running}
                  coupons={resultCoupons}
                  stagger={pageWasReloaded ? 0 : runAnimation.stagger}
                  collapsable={true}
                />
              </div>
            ) : null}
            {renderPostResultCtaInUi &&
            reward.categories &&
            noSavingsAvailable &&
            !this.props.reportAProblem ? (
              <CashBackCategories
                displayInModal
                reward={reward}
                requiresInput={requiresInput}
                tld={tld}
                center
                onClosePopup={this.props.onClosePopup.bind(this)}
              />
            ) : ((noSavingsAvailable && !reward.categories) || !noSavingsAvailable) &&
              reward &&
              reward.amount &&
              renderPostResultCtaInUi &&
              !this.props.reportAProblem &&
              !requiresInput ? (
              <CreditActivated
                postCoupons={postCoupons}
                reward={reward}
                payoutProcessingPeriod={payoutProcessingPeriod}
                exclusions={exclusions}
                tld={tld}
              />
            ) : this.props.demo && renderPostResultCtaInUi && !this.props.reportAProblem ? (
              <ReviewWikibuy
                demo={true}
                onClosePopup={this.props.onClosePopup.bind(this)}
                savings={_.get(this.props, 'view.savings', 0)}
              />
            ) : this.props.reportAProblem ? (
              <ReportAProblem
                email={this.props.email}
                onClosePopup={this.props.onClosePopup.bind(this)}
              />
            ) : renderPostResultCtaInUi &&
              _.get(this.props.storeContentApiData, 'items.length') &&
              hasFeature('content_data') ? (
              <StoreContentData data={this.props.storeContentApiData} />
            ) : !this.props.hasLinkedCard &&
              renderPostResultCtaInUi &&
              hasFeature('link_card_prompt') &&
              !hasFeature('ebates_customer_group') ? (
              <LinkCardPrompt
                onClosePopup={this.props.onClosePopup.bind(this)}
                savings={_.get(this.props, 'view.savings', 0)}
              />
            ) : renderPostResultCtaInUi && !savings && hasFeature('check_coupon_work') ? (
              <CheckCouponWork
                onClosePopup={this.props.onClosePopup.bind(this)}
                domain={this.props.domain}
              />
            ) : renderPostResultCtaInUi && !inviteFriends ? (
              <ReviewWikibuy
                onClosePopup={this.props.onClosePopup.bind(this)}
                savings={_.get(this.props, 'view.savings', 0)}
              />
            ) : renderPostResultCtaInUi ? (
              <InviteTest
                googleContacts={this.props.googleData}
                firstname={_.get(this.props, 'settings.firstname', null)}
                lastname={_.get(this.props, 'settings.lastname', null)}
                shortCode={this.props.shortCode}
                onClosePopup={this.props.onClosePopup.bind(this)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  onTryCodes(skippedSignup) {
    this.setState({viewCodes: false});
    this.props.onTryCodes(skippedSignup);
  }

  renderViewCodes() {
    const {coupons, result, couponCount} = this.props.view;
    const resultCoupons = result ? coupons.slice(couponCount, coupons.length) : coupons;
    return resultCoupons && resultCoupons.length > 0 ? (
      <div>
        <h4 className="bold" style={{marginBottom: '8px', marginTop: '8px', textAlign: 'center'}}>
          <span className="tertiary-link" onClick={this.onClickViewCode.bind(this)}>
            {!this.state.viewCodes ? 'view codes' : 'hide codes'}
          </span>
        </h4>
        <CouponList
          running={this.props.running}
          show={!!this.state.viewCodes}
          coupons={resultCoupons}
          collapsable={true}
          result={result}
          disableChecks={true}
        />
      </div>
    ) : null;
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

export default RenderResult;
