import {React} from 'utility/css-ns';
import _ from 'lodash';
import './tooltip.less';
import {setSeenNotificationTooltip, onChooseCouponPref} from 'actions/couponActions';
import sendMetric from 'utility/sendMetric';
import currentDomain from 'utility/currentDomain';

class Tooltip extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {};
  }

  componentWillMount() {}

  componentDidMount() {
    if (this.props.isAutoCoupMessage) {
      setSeenNotificationTooltip('autoCoupTooltip');
      sendMetric('track', 'aCoupShowTooltip', {
        domain: currentDomain(),
        pagePath: location.pathname
      });
    } else if (this.props.isCreditsReminderMessage) {
      setTimeout(() => {
        sendMetric('page', 'creditIgnoreTooltip', {
          view: 'cashbackNotification',
          type: 'tooltip',
          domain: location.hostname.replace(/^www\./, ''),
          pagePath: location.pathname
        });
        chrome.storage.local.set({seenCreditsReminder: Date.now()});
      }, Number(this.props.delay.replace('ms', '')));
    }
  }

  getCtaButtonText() {
    let ctaButtonText;
    try {
      ctaButtonText = document
        .querySelector('div[style="all: initial;"]')
        .shadowRoot.querySelector('.wbext-primary-btn-large').textContent;
    } catch (e) {
      // do nothing
    }
    return ctaButtonText;
  }

  render() {
    const {
      tipLabel,
      message,
      isAutoCoupMessage,
      autoCoupToolTipDismissed,
      isCreditsReminderMessage
    } = this.props;
    const miniCtaText = 'Turn Off';
    let style = this.props.style || {};
    if (this.props.delay) {
      const delay = {
        animationDelay: this.props.delay
      };
      style = _.merge(delay, style);
    }
    return (
      <div
        style={style}
        className={`new-tooltip ${this.props.position || ''}${
          isAutoCoupMessage ? ' autocoup' : ''
        }${isCreditsReminderMessage ? ' credits-reminder' : ''}${
          autoCoupToolTipDismissed ? ' dismissed' : ''
        }`}>
        <div
          style={this.props.innerStyle || {}}
          onClick={isAutoCoupMessage ? null : this.props.onDismissTooltip.bind(this)}
          className="new-tooltip-wrapper">
          <div
            className="close icon-x"
            onClick={isAutoCoupMessage ? this.props.onDismissTooltip.bind(this) : null}
          />
          {isAutoCoupMessage || isCreditsReminderMessage ? (
            <div className={`triangle ${isCreditsReminderMessage ? 'credits-reminder' : ''}`} />
          ) : null}
          {isAutoCoupMessage ? (
            <div>
              <h5>
                {this.props.tip ? (
                  <span className="bold">{tipLabel ? tipLabel : 'tip:'}</span>
                ) : null}
                {message}
              </h5>
              <button
                onClick={e => {
                  onChooseCouponPref(false, miniCtaText, e);
                  this.props.onClosePopup(miniCtaText, {
                    ctaText: this.getCtaButtonText(),
                    fromTooltip: true
                  });
                }}
                className="turn-off">
                {miniCtaText}
              </button>
            </div>
          ) : (
            <h2>
              {this.props.tip ? <span className="bold">{tipLabel ? tipLabel : 'tip:'}</span> : null}
              {message}
            </h2>
          )}
        </div>
      </div>
    );
  }
}

export default Tooltip;
