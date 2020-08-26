import {React} from 'utility/css-ns';
import hasFeature from 'utility/hasFeature';
import formatCurrency from 'utility/formatCurrency';
import sendMetric from 'utility/sendMetric';

import './ftux-explainer.less';

class FtuxExplainer extends React.Component {
  componentDidMount() {
    sendMetric('track', 'cashbackFTUXNotification', {
      variant: hasFeature('ftux_activate_notification') ? 'activate' : 'continue'
    });
  }

  render() {
    const {exclusions, onActivate, onActivateLater, onShowExclusion, reward} = this.props;
    const rewardText =
      reward.type === 'percentage' ? `${reward.amount / 100}%` : `${formatCurrency(reward.amount)}`;
    return (
      <div className="explainer-container">
        <h2>Ready to earn Wikibuy Credits?</h2>
        <h5>Here's how it works.</h5>
        <div className="explainer">
          <div className="explainer-column">
            <div className="image-container">
              <img
                src="https://cdn.ivaws.com/wikibuy-assets/images/upload_content/ftuxstepone@2x.png"
                alt="Shop with Wikibuy"
              />
            </div>
            <h4>Shop with Wikibuy</h4>
            <p>Shop at 1000+ merchants with Wikibuy.</p>
          </div>
          <div className="explainer-column">
            <div className="image-container">
              <img
                src="https://cdn.ivaws.com/wikibuy-assets/images/upload_content/ftxsteptwo@2x.png"
                alt="Shop with Wikibuy"
              />
            </div>
            <h4>Earn Wikibuy Credits</h4>
            <p>
              Activate to earn Wikibuy Credits and get{' '}
              <span>
                {!!reward.categories ? 'up to ' : ''}
                {rewardText}
              </span>{' '}
              back on your purchases.
            </p>
          </div>
          <div className="explainer-column">
            <div className="image-container">
              <img
                src="https://cdn.ivaws.com/wikibuy-assets/images/upload_content/ftxstepthree@2x.png"
                alt="Shop with Wikibuy"
              />
            </div>
            <h4>Redeem for Gift Cards!</h4>
            <p>Redeem your credits for gift cards at top merchants.</p>
          </div>
        </div>
        <div className="explainer-cta">
          {hasFeature('ftux_activate_notification') && (
            <React.Fragment>
              <div className="primary-btn-large" onClick={() => onActivate({view: 'cashbackFtux'})}>
                Activate
                {!!reward.categories ? ' Up to ' : ' '}
                {rewardText} Back
              </div>
              {!!exclusions ? (
                <div className="exclusions">
                  <h6
                    style={{
                      marginTop: '8px',
                      marginBottom: '0',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                    Exclusions apply,
                    <span
                      style={{paddingLeft: '3px'}}
                      className="tertiary-link-lighter"
                      onClick={onShowExclusion}>
                      {' '}
                      view details.
                    </span>
                  </h6>
                </div>
              ) : null}
            </React.Fragment>
          )}
          {hasFeature('ftux_continue_notification') && (
            <div className="primary-link" onClick={onActivateLater}>
              Continue Shopping
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default FtuxExplainer;
