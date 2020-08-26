import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import {WIKIBUY_URL} from 'constants';
import numeral from 'numeral';
import sendMetric from 'utility/sendMetric';
import formatCurrency from 'utility/formatCurrency';
import './cash-back-categories.less';

class CashBackCategories extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false
    };
  }

  toggleContainerSize(e) {
    e.preventDefault();
    this.setState({
      expanded: !this.state.expanded
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
    const {expanded} = this.state;
    const {
      center,
      couponCount,
      displayInModal,
      hasCoupons,
      reward,
      runTimeSeconds,
      showCouponCount,
      showDismiss,
      showReward
    } = this.props;
    const rewardDisplay = showReward
      ? reward.type === 'percentage'
        ? `${reward.amount / 100}%`
        : formatCurrency(reward.amount)
      : '';
    const showSizeToggle = reward && _.get(reward, 'categories.length', 0) > 5;
    const MAX_COLLAPSED_DISPLAY_AMOUNT = 5;
    const categories = _.get(reward, 'categories', []);
    // const sortedCategories = _.reverse(_.sortBy(reward.categories, category => category.amount));
    const categoriesToDisplay = expanded
      ? categories
      : categories.slice(0, MAX_COLLAPSED_DISPLAY_AMOUNT);

    if (!reward.categories) {
      return null;
    }

    return (
      <div
        className={`simple-section ${center ? 'center' : ''} ${
          displayInModal ? 'display-in-modal' : ''
        }`}>
        {showReward && (
          <div className="reward-text">
            <h2>
              Up to <span className="palmetto">{rewardDisplay}</span> Credit Activated
            </h2>
            {showCouponCount && (
              <h6 className="bold center">
                {couponCount} {couponCount === 1 ? ' code ' : ' best codes '} tested in{' '}
                {runTimeSeconds} sec.
              </h6>
            )}
            <h6 className="exclusion-text center">
              *Exclusions apply,{' '}
              <span className="tertiary-link-lighter" onClick={this.onShowExclusion.bind(this)}>
                view details.
              </span>
            </h6>
          </div>
        )}
        <div className="reward-categories">
          <h5>Credits by Categories</h5>
          <div className={`cashback-category-section ${hasCoupons && 'show-border'}`}>
            <div className={`cashback-category-container ${expanded && 'expanded'}`}>
              {_.map(categoriesToDisplay, ({name, amount, type}) => (
                <div className="cashback-category-row" key={name}>
                  {name}
                  <span>{type === 'percentage' ? `${amount / 100}%` : formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
            {showSizeToggle && (
              <h5 className="toggle-container-cta" onClick={this.toggleContainerSize.bind(this)}>
                Show {this.state.expanded ? 'fewer' : 'all'} categories
              </h5>
            )}
          </div>
        </div>
        {showDismiss && (
          <div className="dismiss-notif">
            <h4 className="primary-link bold" onClick={this.props.onClosePopup.bind(this)}>
              Continue to Checkout
            </h4>
          </div>
        )}
      </div>
    );
  }
}

export default CashBackCategories;
