import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import sendMetric from 'utility/sendMetric';
import AnnotationTooltip from '../AnnotationTooltip';
import './offer-available-elsewhere.less';

class OfferWhenUnavailableDetails extends Component {
  componentDidMount() {
    sendMetric('page', 'offerAvailableElsewhereTooltip', {
      view: 'quoteCompleteNotification',
      type: 'notificationHover',
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
  }

  render() {
    const run = this.props.run;
    const result = _.get(run, 'results[1]');
    return (
      <AnnotationTooltip
        onCloseTooltip={this.props.onCloseTooltip}
        classes="offer-when-unavailable-details">
        <div className="comparison" onClick={() => this.props.viewProductPage(result.resultId)}>
          <h2>This item may be in stock on another site.</h2>
          <br />
          <span className="text">Go to Wikibuy to view availability on other sites. Please note, pricing may vary significantly.</span>
        </div>
        <button
          className="button-style primary-btn-large"
          onClick={() => this.props.viewProductPage(result.resultId)}>
          Continue to Wikibuy
        </button>
      </AnnotationTooltip>
    );
  }
}

export default OfferWhenUnavailableDetails;
