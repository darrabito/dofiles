import {React} from 'utility/css-ns';
import sendMetric from 'utility/sendMetric';
import formatCurrency from 'utility/formatCurrency';
import activatedEbates from 'messenger/outbound/hasActivatedEbates';
import activatedHoney from 'messenger/outbound/hasActivatedHoney';
import {Component} from 'react';
import moment from 'moment';

class WarnAboutCashback extends Component {
  componentDidMount() {
    const {tld, hasActivatedEbates, hasActivatedHoney} = this.props;
    const publisher = hasActivatedEbates ? 'ebates' : hasActivatedHoney ? 'honey' : '';
    sendMetric('page', 'creditCompetitorClickWarning', {
      view: 'creditCompetitorClickWarning',
      type: 'notification',
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname,
      publisher
    });

    chrome.storage.local.set({[`${publisher}WarningNotif-${tld}`]: moment().unix()}, () => {
      if (hasActivatedEbates) {
        activatedEbates({[tld]: false});
      }

      if (hasActivatedHoney) {
        activatedHoney({[tld]: false});
      }
    });
  }

  render() {
    const reward = this.props.reward;
    const rewardDisplay =
      reward.type === 'percentage' ? `${reward.amount / 100}%` : formatCurrency(reward.amount);
    return (
      <div>
        <h2>Your {rewardDisplay} Wikibuy Credit is no longer active.</h2>
        <p style={{margin: '12px 0'}}>
          Another extension may have been activated. Click below to reactivate your Wikibuy Credit.
        </p>
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
            <button className="primary-btn-large" onClick={this.props.onActivateWarn}>
              Reactivate {rewardDisplay}
            </button>
          )}
        </div>
      </div>
    );
  }
}

export default WarnAboutCashback;
