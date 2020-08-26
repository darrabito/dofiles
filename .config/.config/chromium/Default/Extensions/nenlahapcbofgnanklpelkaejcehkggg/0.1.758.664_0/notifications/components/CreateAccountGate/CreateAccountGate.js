import {React} from 'utility/css-ns';
import hasFeature from 'utility/hasFeature';
import {Component} from 'react';
import GetStartedV2Light from './components/GetStartedV2Light';
import AddName from './components/AddName';
import {WIKIBUY_URL} from 'constants';
import SignInLight from './components/SignInLight';
import sendMetric from 'utility/sendMetric';
import {fetchAuthToken} from 'actions/accountActions';
import './create-account-gate.less';

class CreateAccountGate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      forceWebappAuth: false,
      signIn: hasFeature('auth_gate_start_w_signin')
    };
  }

  componentWillMount() {
    sendMetric('page', 'extensionAccountGate', {
      reason: this.props.accountGateType
    });
    fetchAuthToken();
  }

  render() {
    const addName = this.props.accountGateType === 'addName';
    return this.state.forceWebappAuth ? (
      <div className={`modal-wrapper-gate-modal-light-component auth-error`}>
        <div className="inner-modal">
          <h2>Oops, we are having trouble verifying your account</h2>
          <a
            href={`${WIKIBUY_URL}/sign-in`}
            target="_blank"
            className="bold charcoal secondary-link">
            Click here to try again
          </a>
        </div>
      </div>
    ) : (
      <div className={`modal-wrapper-gate-modal-light-component`}>
        <div className="inner-modal">
          <div>
            {this.state.signIn && !addName ? (
              <h2 style={{textAlign: 'center', margin: '0px auto 4px'}}>
                Please sign in to continue
              </h2>
            ) : (
              <h2 style={{textAlign: 'center', margin: '0px auto 4px'}}>
                Please finish creating your account to continue
              </h2>
            )}
          </div>
          <div className="join-step">
            {addName ? (
              <AddName nextStep={this.onNextStep.bind(this)} />
            ) : this.state.signIn ? (
              <SignInLight
                toggleWebappAuth={this.toggleWebappAuth.bind(this)}
                nextStep={this.onNextStep.bind(this)}
              />
            ) : (
              <GetStartedV2Light
                toggleWebappAuth={this.toggleWebappAuth.bind(this)}
                nextStep={this.onNextStep.bind(this)}
                session={this.props.session}
              />
            )}
          </div>
        </div>
        {addName ? null : this.state.signIn ? (
          <h6 style={{fontSize: '13px'}} className="bold already-have-account charcoal">
            Don't have an account?{' '}
            <span
              onClick={() => {
                this.setState({signIn: !this.state.signIn})
              }}
              style={{marginLeft: 4}}
              className="secondary-link">
              {' '}
              Create Account.{' '}
            </span>
          </h6>
        ) : (
          <h6 style={{fontSize: '13px'}} className="a bold already-have-account charcoal">
            Already have an account?{' '}
            <span
              onClick={() => {
                this.setState({signIn: !this.state.signIn});
              }}
              style={{marginLeft: 4}}
              className="secondary-link">
              {' '}
              Sign In.{' '}
            </span>
          </h6>
        )}
      </div>
    );
  }

  toggleWebappAuth() {
    this.setState({forceWebappAuth: !this.state.forceWebappAuth});
  }

  onNextStep() {
    this.props.onSubmitAccountSuccess();
  }
}

export default CreateAccountGate;