import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import {WIKIBUY_URL} from 'constants';
import sendMetric from 'utility/sendMetric';
import isFullAccount from 'utility/isFullAccount';
import formatCurrency from 'utility/formatCurrency';

class ConfirmDismiss extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoggedIn: isFullAccount()
    };
  }

  componentDidMount() {
    const dismissedSite = location.hostname.replace(/^www\.|\.com$/g, '');
    const storageKey = `dismissedCredits-${dismissedSite}`;
    chrome.storage.local.set({[storageKey]: Date.now()});
    sendMetric('page', 'creditDismissReminder', {
      view: 'cashbackNotification',
      type: 'notification',
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
  }

  onActivate(options) {
    this.props.onActivate({view: 'creditReminder', ...options});
  }

  render() {
    const reward = _.get(this.props.view, 'reward');
    const tld = _.get(this.props.view, 'deweyResult.domain');

    let cbDollarAmt;
    if (reward && reward.type !== 'percentage') {
      if (reward.amount) {
        cbDollarAmt = formatCurrency(reward.amount);
      }
    }
    const rewardText = cbDollarAmt ? (
      <span>
        <span>{cbDollarAmt}</span>
      </span>
    ) : (
      <span>
        <span>{reward.amount / 100}%</span>
      </span>
    );

    return (
      <div className="simple-section">
        <h2>Activating credit is easy</h2>
        <p className="confirm-dismiss-text">
          By activating this offer now you will earn up to {rewardText} back in Wikibuy Credit on
          your purchase at {tld}. It’s completely free.
        </p>
        {this.state.isLoggedIn ? (
          <div className="button-wrapper">
            {this.props.activated ? (
              <button className="primary-btn-large" disabled={true}>
                Activated
              </button>
            ) : this.props.activating ? (
              <button className="primary-btn-large" disabled={true}>
                Activating
              </button>
            ) : (
              <button className="primary-btn-large" onClick={this.onActivate.bind(this)}>
                Activate {rewardText}
              </button>
            )}
            <div className="button-wrapper">
              <h4
                className="bold tertiary-link activate-later"
                onClick={this.props.onConfirmDismiss}>
                Not interested
              </h4>
            </div>
          </div>
        ) : (
          <div>
            <div className="button-wrapper">
              <button className="primary-btn-large" onClick={this.onClickSignIn.bind(this)}>
                Activate {rewardText}
              </button>
            </div>
            <div className="button-wrapper">
              <h4
                className="bold tertiary-link activate-later"
                onClick={this.props.onConfirmDismiss}>
                Not interested
              </h4>
            </div>
          </div>
        )}
        {_.get(this.props, 'view.exclusions') ? (
          <h6
            style={{
              height: '29px',
              marginTop: '4px',
              marginBottom: '0',
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
        ) : (
          <div style={{height: '14px'}} />
        )}
      </div>
    );
  }
  onClickSignIn() {
    const storeName = _.get(this.props.view, 'vendor');
    if (storeName !== 'eBay') {
      this.onActivate({preventHide: !this.state.hasClickedToLogin});
    }
    window.open(`${WIKIBUY_URL}/sign-in`);
    this.setState({hasClickedToLogin: true});
  }
}

export default ConfirmDismiss;
