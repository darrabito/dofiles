import {React} from 'utility/css-ns';

function ActivateButton(props) {
  const {activating, activated, onActivate} = props;
  return (
    <div className="button-wrapper">
      {activated ? (
        <button className="primary-btn-large full-button" disabled={true}>
          Activated
        </button>
      ) : activating ? (
        <button className="primary-btn-large full-button" disabled={true}>
          Activating
        </button>
      ) : (
        <button className="primary-btn-large full-button" onClick={() => onActivate()}>
          Activate
        </button>
      )}
    </div>
  );
}

export default ActivateButton;
