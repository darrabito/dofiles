import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import Loader from 'components/Loader';
import sendMetric from 'utility/sendMetric';
import AddEmail from '../GetStartedV2Light/components/AddEmail';
import AddPassword from '../GetStartedV2Light/components/AddPassword';

import {signIn} from 'actions/accountActions';

import './sign-in-light.less';

class SignInLight extends Component {
  constructor(...args) {
    super(...args);
    this.state = {};
  }

  render() {
    const error = this.state.error;
    const awaitingSave = this.state.awaitingSave;
    const {...forwardProps} = this.props;
    const disabledClick = this.state.disabledClick;
    const signInErrorAction = error && error.indexOf('__SIGN_IN__') > -1;

    return (
      <div className={`sign-in-light`}>
        <form>
          <div className="sign-in-wrapper">
            <div className="body">
              <section className="email">
                <AddEmail
                  autoFocus={true}
                  disabledClick={disabledClick}
                  tabIndex={null}
                  setEmail={this.setEmail.bind(this)}
                  {...forwardProps}
                />
              </section>

              <section className="password">
                <AddPassword
                  placeholder="Enter Password"
                  disabledClick={disabledClick}
                  tabIndex={null}
                  setPassword={this.setPassword.bind(this)}
                  {...forwardProps}
                />
              </section>


              <footer>
                <button
                  tabIndex={null}
                  disabled={
                    awaitingSave ||
                    !this.state.password ||
                    !this.state.email
                  }
                  onClick={this.onSubmit.bind(this)}
                  className="primary-btn-large">
                  {awaitingSave ? (
                    <Loader light={true} scale={0.3} size={22} color={'#888888'} />
                  ) : (
                    'Continue'
                  )}
                  {awaitingSave || !this.state.password || !this.state.email ? (
                    <div onClick={this.disabledClick.bind(this)} className="disbaled-click-capture" />
                  ) : null}
                </button>

                {signInErrorAction || error ? (
                  <p className="error">
                    {signInErrorAction ? (
                      <span>
                        {error.replace('__SIGN_IN__', '')}
                        <a href="https://wikibuy.com/sign-in" className="secondary-link">
                          Sign in.
                        </a>
                      </span>
                    ) : (
                      error
                    )}
                  </p>
                ) : null}
              </footer>
            </div>
          </div>
        </form>
      </div>
    );
  }

  disabledClick() {
    const obj = {
      awaitingSave: this.state.awaitingSave,
      password: !!this.state.password,
      email: !!this.state.email,
      zip: !!this.state.location,
      prime: !!this.state.answeredPrime
    };
    sendMetric('trackClick', 'disabledButtonClick', 'continue', {
      name: 'create_account',
      validation: JSON.stringify(obj)
    });
    this.setState({disabledClick: true});
  }


  setEmail(email) {
    this.setState({email});
  }

  setPassword(password) {
    this.setState({password});
  }

  async onSubmit(e) {
    e.preventDefault();
    if (!this.state.password || !this.state.email || this.state.awaitingSave) {
      return;
    }

    sendMetric('track', 'signIn', {
      view: 'extGate',
      email: this.state.email
    });

    const account = {
      email: this.state.email,
      password: this.state.password
    };

    this.setState({awaitingSave: true, error: false});
    const response = await signIn(account);
    this.setState({awaitingSave: false});
    if (!_.get(response, 'error')) {
      this.props.nextStep();
    } else {
      this.setState({error: response.error});
      sendMetric('track', 'signInError', {
        view: 'extGate',
        email: this.state.email
      });
    }
  }
}

export default SignInLight;
