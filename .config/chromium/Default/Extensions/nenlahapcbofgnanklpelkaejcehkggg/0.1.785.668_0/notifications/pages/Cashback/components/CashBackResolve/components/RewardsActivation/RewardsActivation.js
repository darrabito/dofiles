import {React} from 'utility/css-ns';
import WarnAboutCashback from 'components/WarnAboutCashback';
import CashbackSectionSimple from './components/CashbackSectionSimple';

function RewardsActivation(props) {
  const {
    hasActivated,
    warnAboutStandDown,
    onActivate,
    onSignup,
    activated,
    activating,
    activate,
    showInitialSignup,
    session,
    view,
    onActivateWarn,
    reward,
    innerCopy,
    outerCopy,
    mousedOver,
    userCreditAmount,
    deweyResult,
    hasCoupons,
    showCreditsReminder,
    tld,
    hasActivatedEbates,
    hasActivatedHoney,
    hasPromotionalReward,
    onShowExclusion
  } = props;

  return (
    <div className="rewards-activation">
      {(hasActivated && warnAboutStandDown) || hasActivatedEbates || hasActivatedHoney ? (
        <WarnAboutCashback
          reward={reward}
          activated={activated}
          activating={activating}
          onActivateWarn={onActivateWarn}
          hasActivatedEbates={hasActivatedEbates}
          hasActivatedHoney={hasActivatedHoney}
          tld={tld}
        />
      ) : (
        <CashbackSectionSimple
          userCreditAmount={userCreditAmount}
          view={view}
          session={session}
          showInitialSignup={showInitialSignup}
          activate={activate}
          activating={activating}
          activated={activated}
          onSignup={onSignup}
          onActivate={onActivate}
          hasCoupons={hasCoupons}
          innerCopy={innerCopy}
          outerCopy={outerCopy}
          tld={tld}
          mousedOver={mousedOver}
          deweyResult={deweyResult}
          showCreditsReminder={showCreditsReminder}
          hasPromotionalReward={hasPromotionalReward}
          onShowExclusion={onShowExclusion}
        />
      )}
    </div>
  );
}

export default RewardsActivation;
