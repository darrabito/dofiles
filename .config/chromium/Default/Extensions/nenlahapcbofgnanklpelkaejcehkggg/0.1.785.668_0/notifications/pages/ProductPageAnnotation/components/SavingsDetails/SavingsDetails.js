import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import hasFeature from 'utility/hasFeature';
import formatCurrency from 'utility/formatCurrency';
import sendMetric from 'utility/sendMetric';
import numeral from 'numeral';
import AnnotationTooltip from '../AnnotationTooltip';
import {WIKIBUY_URL} from 'constants';
import './savings-details.less';

// <div className="breakdown-item">
//   <div className="label">Fulfilled by Amazon:</div>
//   <div className="value">{vendor === 'Amazon' ? <span>&#10003;</span> : <span>&#8212;</span>}</div>
// </div>
// <div className="breakdown-item">
//   <div className="label">Prime Shipping:</div>
//   <div className="value">{vendor === 'Amazon' ? <span>&#10003;</span> : <span>&#8212;</span>}</div>
// </div>

const CompareItem = ({classes, result, hasReward, hasDiscount}) => {
  const vendor = _.get(result, 'origin') ? 'Amazon' : 'Wikibuy';
  const shipping = _.get(result, 'pricing.shipping');
  const discount = _.get(result, 'pricing.discount');
  const tax = _.get(result, 'pricing.tax');
  const shippingAndTax = !shipping && !tax ? 'Included' : formatCurrency(shipping + tax);
  const minDays = _.get(result, 'details.estimatedDeliveryMinDays');
  const maxDays = _.get(result, 'details.estimatedDeliveryMaxDays');
  const deliveryInDays =
    minDays && maxDays && minDays !== maxDays
      ? `${minDays} - ${maxDays}`
      : minDays || maxDays
      ? `${minDays || maxDays}`
      : null;
  const shippingSpeed = _.get(result, 'pricing.shippingSpeed');
  const reward = _.get(result, 'pricing.reward.amount');
  // TODO handle marketplace sellers and marketplace comparison
  return (
    <div className={`${classes} compare-item`}>
      <h2>{vendor} Total</h2>
      <div className="breakdown">
        <div className="breakdown-item price">
          <div className="label">Price:</div>
          <div className="value">{formatCurrency(_.get(result, 'pricing.subtotal'))}</div>
        </div>
        <div className="breakdown-item tax">
          <div className="label">Shipping & Tax:</div>
          <div className="value">{shippingAndTax}</div>
        </div>
        {hasDiscount ? (
          <div className="breakdown-item tax">
            <div className="label">Discount:</div>
            {discount ? (
              <div className="value green">-{formatCurrency(discount)}</div>
            ) : (
              <div className="value">
                <span>&#8212;</span>
              </div>
            )}
          </div>
        ) : null}
        {hasReward ? (
          <div className="breakdown-item tax">
            <div className="label">Credit:</div>
            {reward ? (
              <div className="value green">{reward / 100}% back</div>
            ) : (
              <div className="value">
                <span>&#8212;</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
      <div className="summary">
        <div>
          <h1>
            {reward
              ? formatCurrency(_.get(result, 'pricing.afterRewardTotal'))
              : formatCurrency(_.get(result, 'pricing.total'))}
          </h1>
          {deliveryInDays ? (
            <h6>
              Arrives in{' '}
              {deliveryInDays === '1' ? `${deliveryInDays} day` : `${deliveryInDays} days`}
            </h6>
          ) : shippingSpeed ? (
            <h6>{shippingSpeed} Shipping</h6>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const CompareItemWithCredits = ({classes, result, hasReward, hasDiscount, exclusions}) => {
  const vendor = _.get(result, 'origin') ? 'Amazon' : 'Wikibuy';
  const shipping = _.get(result, 'pricing.shipping');
  const discount = _.get(result, 'pricing.discount');
  const afterRewardTotal = _.get(result, 'pricing.afterRewardTotal');
  const loyaltyAmount = _.get(result, 'pricing.loyaltyAmount');
  const tax = _.get(result, 'pricing.tax');
  const shippingAndTax = !shipping && !tax ? 'Included' : formatCurrency(shipping + tax);
  const minDays = _.get(result, 'details.estimatedDeliveryMinDays');
  const maxDays = _.get(result, 'details.estimatedDeliveryMaxDays');
  const deliveryInDays =
    minDays && maxDays && minDays !== maxDays
      ? `${minDays} - ${maxDays}`
      : minDays || maxDays
      ? `${minDays || maxDays}`
      : null;
  const shippingSpeed = _.get(result, 'pricing.shippingSpeed');
  const reward = _.get(result, 'pricing.reward.amount');

  function onClickExclusion(result, e) {
    e.stopPropagation();
    window.open(`${WIKIBUY_URL}/s/${result.vendor}/coupon`);
  }

  // TODO handle marketplace sellers and marketplace comparison
  return (
    <div className={`${classes} compare-item after-credits`}>
      <h2>{vendor} Total</h2>
      <div className="breakdown">
        <div className="breakdown-item price">
          <div className="label">Price:</div>
          <div className="value">{formatCurrency(_.get(result, 'pricing.subtotal'))}</div>
        </div>
        <div className="breakdown-item tax">
          <div className="label">Shipping & Tax:</div>
          <div className="value">{shippingAndTax}</div>
        </div>

        {hasDiscount ? (
          <div className="breakdown-item tax">
            <div className="label">Discount:</div>
            {discount ? (
              <div className="value green">-{formatCurrency(discount)}</div>
            ) : (
              <div className="value">
                <span>&#8212;</span>
              </div>
            )}
          </div>
        ) : null}

        <div className="divider"></div>

        <div className="breakdown-item tax">
          <div className="label">Purchase Price:</div>
          <div className="value">{formatCurrency(_.get(result, 'pricing.total'))}</div>
        </div>

        <div className="breakdown-item tax">
          <div className="label">
            Wikibuy Credits:
            {reward ? (
              <div style={{marginTop: '4px'}} className="green">
                {reward / 100}% back
              </div>
            ) : null}
          </div>
          <div className="value">{formatCurrency(loyaltyAmount)}</div>
        </div>
      </div>
      <div className="summary">
        <div>
          <h1>{formatCurrency(afterRewardTotal)}</h1>
          <h6 className="palmetto">After Credit</h6>

          {deliveryInDays ? (
            <h6 style={{marginTop: '10px'}}>
              Arrives in{' '}
              {deliveryInDays === '1' ? `${deliveryInDays} day` : `${deliveryInDays} days`}
            </h6>
          ) : shippingSpeed ? (
            <h6>{shippingSpeed} Shipping</h6>
          ) : null}
        </div>
      </div>
      {exclusions ? (
        <h6 className="exclusions">
          Exclusions may apply.{' '}
          <span className="charcoal" onClick={onClickExclusion.bind(this, result)}>
            View details
          </span>
        </h6>
      ) : null}
    </div>
  );
};

class SavingsDetails extends Component {
  componentDidMount() {
    sendMetric('page', 'savingsDetailsTooltip', {
      view: 'quoteCompleteNotification',
      type: 'notificationHover',
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
  }

  render() {
    const run = this.props.run;
    const result = _.find(_.get(run, 'results'), {heroOffer: true});
    const originResult = _.find(_.get(run, 'results'), {origin: true});
    const resultIsAmazonMarketplace = _.get(result, 'product.vendor') === 'amazon.com';
    const reward = _.get(result, 'pricing.reward.amount');
    const discount = _.get(result, 'pricing.discount');
    const loyaltyAmount = _.get(result, 'pricing.loyaltyAmount');
    const exclusions = _.get(result, 'pricing.reward.exclusions');

    let savings = _.get(result, 'savings') > 0 ? _.get(result, 'savings') : 0;
    savings = hasFeature('show_total_after_credits')
      ? (savings || 0) + (loyaltyAmount || 0)
      : savings;

    const percentOff = _.get(originResult, 'pricing.total')
      ? savings / _.get(originResult, 'pricing.total')
      : 0;
    const percentOffPercent = numeral(percentOff).format('0,0%');
    

    return (
      <AnnotationTooltip
        onCloseTooltip={this.props.onCloseTooltip}
        classes="savings-details-tooltip">
        {resultIsAmazonMarketplace ? (
          <h2>
            Save <span className="bold">{formatCurrency(savings)}</span> buying from a different{' '}
            <br />
            Amazon seller.
          </h2>
        ) : savings ? (
          <h2>
            Save <span className="bold">{formatCurrency(savings)}</span> buying from a different
            seller.
          </h2>
        ) : reward ? (
          <h2>
            Get <span className="bold">{reward / 100}%</span> back buying from a different seller.
          </h2>
        ) : null}
        <div className="comparison" onClick={() => this.props.viewProductPage()}>
          <CompareItem
            classes="origin-result"
            hasDiscount={!!discount}
            result={originResult}
            hasReward={!!reward}
          />
          {loyaltyAmount && hasFeature('show_total_after_credits') ? (
            <CompareItemWithCredits
              exclusions={exclusions}
              classes="wikibuy-result"
              hasDiscount={!!discount}
              result={result}
              hasReward={!!reward}
            />
          ) : (
            <CompareItem
              classes="wikibuy-result"
              hasDiscount={!!discount}
              result={result}
              hasReward={!!reward}
            />
          )}
        </div>

        {resultIsAmazonMarketplace ? (
          <button
            className="button-style primary-btn-large"
            onClick={this.props.addToAmazonCart.bind(this, result)}>
            Add item to Amazon Cart{' '}
            {percentOff && percentOffPercent !== '0%' ? (
              <span>
                <span className="pipe">|</span>
                {`${numeral(percentOff).format('0,0%')}`} off
              </span>
            ) : null}
          </button>
        ) : (
          <button
            style={loyaltyAmount && exclusions ? {marginTop: '35px'} : {}}
            className="button-style primary-btn-large"
            onClick={() => this.props.viewProductPage()}>
            Continue to Wikibuy{' '}
            {percentOff && percentOffPercent !== '0%' ? (
              <span>
                <span className="pipe">|</span>
                {`${numeral(percentOff).format('0,0%')}`} off
              </span>
            ) : null}
          </button>
        )}
      </AnnotationTooltip>
    );
  }
}

export default SavingsDetails;