import {React} from 'utility/css-ns';
import formatCurrency from 'utility/formatCurrency';

function RewardsText({reward, storeName}) {
  return (
    <div>
      {reward.type === 'percentage' ? (
        <h2>
          Get {reward.categories ? 'up to' : ''}{' '}
          <span className="green">{reward.amount / 100}%</span> back
        </h2>
      ) : (
        <h2>
          Get {reward.categories ? 'up to' : ''}{' '}
          <span className="green">{formatCurrency(reward.amount)}</span> in credit
        </h2>
      )}
      <h4 className="bold">on {storeName}.</h4>
    </div>
  );
}

export default RewardsText;
