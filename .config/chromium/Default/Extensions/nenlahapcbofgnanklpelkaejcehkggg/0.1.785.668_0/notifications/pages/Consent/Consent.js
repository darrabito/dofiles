import {React} from 'utility/css-ns';
import {Component} from 'react';
import {Motion, spring} from 'react-motion';
import {branch} from 'higher-order/baobab';
import sendMetric from 'utility/sendMetric';
import './consent.less';
import consentMessenger from 'messenger/outbound/consentMessenger';

class Consent extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      hideNotification: false,
      ctaHasBeenClicked: false
    };
  }

  async onClickCTA(label) {
    if (this.state.ctaHasBeenClicked) {
      this.closePopup(label);
      return;
    }
    this.setState({ctaHasBeenClicked: true});
    setTimeout(() => {
      this.setState({hideNotification: true});
    }, 3000);
    await consentMessenger({message: 'enableTracking'});
    sendMetric('trackClick', 'consentCtaClick', label, {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
  }

  closePopup(label, setPrefDisabled) {
    if (setPrefDisabled === true) {
      consentMessenger({message: 'disableTracking'}); // don't have to await
    }
    this.setState({hideNotification: true});
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

  render() {
    const {hideNotification, ctaHasBeenClicked} = this.state;
    const heading = ctaHasBeenClicked ? 'Thank you.' : 'Get the most out of Wikibuy!';
    const subheading = ctaHasBeenClicked
      ? 'Thank you for helping us improve our products and find you the best deals and savings.'
      : 'To begin using Wikibuy, please review the following information.';
    const ctaText = ctaHasBeenClicked ? 'Done' : 'Yes, Opt-in';
    const cancelText = 'No, Opt-out';

    const showOnTop = true;
    const showOnRight = true;
    const bigModal = true;
    return (
      <div
        className={`consent-notification-wrapper${bigModal ? ' full' : ''}${
          hideNotification ? ' disabled' : ''
        }`}>
        <div
          className={`consent-notification${hideNotification ? ' disabled' : ''}${
            bigModal ? ' center-middle' : ''
          }`}
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
                className="consent-notification-content"
                style={{
                  transform: `translate3d(0,${y}%,0)`,
                  opacity: `${opacity}`
                }}>
                <header>
                  <div className="w-icon-logo" style={{height: '40px', width: '60px'}}>
                    {this.renderWIcon()}
                  </div>
                  <div className="close icon-x" onClick={this.closePopup.bind(this, 'x')} />
                </header>
                <section>
                  <h2 className="midnight">{heading}</h2>
                  <h4 className={`subheading${ctaHasBeenClicked ? ' post-click' : ''}`}>{subheading}</h4>
                  {ctaHasBeenClicked ? null : (
                    <div className="bullet-list">
                      <div>
                        <div className="li-text">We do not sell your data.</div>
                      </div>
                      <div>
                        <div className="li-text">
                          We may use online tracking devices such as pixel tags and web beacons to
                          collect analytics data relating to your online shopping activity in order
                          to provide you with the best online shopping deals. This data includes IP
                          address to infer location, date and time of use, language preferences,
                          operating system, and browser type. We only collect data on sites that are
                          retail, shopping, or merchant partner sites (in other words, sites on
                          which you can make purchases).
                        </div>
                      </div>
                      <div>
                        <div className="li-text">
                          We may also collect personal information on sites we’ve determined to be
                          shopping sites, namely the full URL of the pages you are visiting on these
                          sites.
                        </div>
                      </div>
                      <div>
                        <div className="li-text">
                          We may use this data to improve, personalize, and optimize your website
                          browsing, or to improve or develop new products and services, by noting
                          which parts of our website you visit and which aspects you find most
                          useful. This includes when you log in and out of Wikibuy, when you view
                          specific products on a merchant site, add items to your cart, complete
                          purchases, or otherwise engage with the extension.
                        </div>
                      </div>
                    </div>
                  )}
                  {ctaHasBeenClicked ? null : (
                    <div className="opt-in-description">
                      Opting into Wikibuy analytics allows us to provide a personalized shopping
                      experience, optimizing your website browsing to find you deals and savings. If
                      you choose to opt out and not allow Wikibuy to collect data, it may result in
                      receiving offers that are not as relevant to you or cause you to miss out on
                      deals and savings.
                    </div>
                  )}
                  {ctaHasBeenClicked ? null : (
                    <div className="final-prompt">
                      Would you like to opt in to Wikibuy analytics, as well as collecting personal
                      information described above, to receive personalized deals and savings?
                    </div>
                  )}
                  <div className="options-wrapper">
                    <div className={`button-wrapper${ctaHasBeenClicked ? '' : ' pre-click'}`}>
                      <button
                        className="primary-btn-large"
                        onClick={this.onClickCTA.bind(this, ctaText)}>
                        {ctaText}
                      </button>
                    </div>
                    {ctaHasBeenClicked ? null : (
                      <div className="button-wrapper cancel">
                        <button
                          className={`primary-btn-large`}
                          onClick={this.closePopup.bind(this, cancelText, true)}>
                          {cancelText}
                        </button>
                      </div>
                    )}
                  </div>
                  {ctaHasBeenClicked ? null : (
                    <div className="explanation">
                      <div>
                        You can change your{' '}
                        <span
                          onClick={() => {
                            consentMessenger({message: 'openOptionsPage'});
                          }}>
                          preferences
                        </span>{' '}
                        in settings any time. Our{' '}
                        <a href="https://wikibuy.com/our-terms/privacy-policy" target="_blank">
                          Privacy Policy
                        </a>{' '}
                        explains how we keep your data safe.
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </Motion>
        </div>
      </div>
    );
  }
}

export default branch({}, Consent);
