import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import Loader from 'components/Loader';
import sendMetric from 'utility/sendMetric';
import ZipCodeFormWrapper from './components/ZipCodeFormWrapper';
import AddEmail from './components/AddEmail';
import AddPassword from './components/AddPassword';

import {createAccount} from 'actions/accountActions';
import isFirstLastNameValid from 'utility/isFirstLastNameValid';
import getCurrentInputElement from 'utility/getCurrentInputElement';

import './get-started-light.less';

class GetStarted extends Component {
  constructor(...args) {
    super(...args);
    this.state = {};
  }

  componentDidUpdate(prevProps, prevState) {
    const primeInvalidButDirty =
      (this.state.password &&
        this.state.email &&
        this.state.location &&
        !this.state.answeredPrime) ||
      (!this.state.answeredPrime && this.state.disabledClick);
    const prevPrimeInvalidButDirty =
      (prevState.password && prevState.email && prevState.location && !prevState.answeredPrime) ||
      (!prevState.answeredPrime && prevState.disabledClick);
    if (primeInvalidButDirty && !prevPrimeInvalidButDirty) {
      sendMetric('trackError', 'accountPrimeFormError', 'select prime');
    }

    const nameInvalidButDirty =
      (this.state.answeredPrime ||
        this.state.password ||
        this.state.email ||
        this.state.location) &&
      (!this.state.firstname || !this.state.lastname);
    const prevNameInvalidButDirty =
      (prevState.answeredPrime || prevState.password || prevState.email || prevState.location) &&
      (!prevState.firstname || !prevState.lastname);
    const nameError = this.hasNameError(this.state);
    const prevNameError = this.hasNameError(prevState);
    if (
      (nameError && nameError !== prevNameError) ||
      (nameInvalidButDirty && !prevNameInvalidButDirty)
    ) {
      sendMetric('trackError', 'accountNameFormError', 'add name');
    }
  }

  validSubmitOnEnter() {
    const awaitingSave = this.state.awaitingSave;
    const hasNameError =
      !this.state.firstname || !this.state.lastname || this.hasNameError(this.state);
    if (
      this.state.email &&
      this.state.password &&
      this.state.location &&
      this.state.answeredPrime &&
      this.state.agreedToTerms &&
      !hasNameError &&
      !awaitingSave
    ) {
      return true;
    }
  }

  hasNameError(state) {
    if (state.firstnameDirty && state.lastnameDirty) {
      const firstNameValid = isFirstLastNameValid(state.firstname, 'firstname');
      const lastNameValid = isFirstLastNameValid(state.lastname, 'lastname');
      return firstNameValid.error || lastNameValid.error;
    }
  }

  render() {
    const error = this.state.error;
    const awaitingSave = this.state.awaitingSave;
    const {...forwardProps} = this.props;
    const disabledClick = this.state.disabledClick;
    const signInErrorAction = error && error.indexOf('__SIGN_IN__') > -1;

    let nameError = this.hasNameError(this.state);
    const disabledDueToName = !this.state.firstname || !this.state.lastname || nameError;

    return (
      <div className={`get-started-light`}>
        <form>
          <div className="get-started-wrapper">
            <div className="body">
              <section className="name">
                <div style={{position: 'relative'}} className="designed-form">
                  <div className={`designed-form input-wrapper name-wrapper`}>
                    <input
                      value={this.state.firstname || ''}
                      onBlur={() =>
                        this.setState({
                          firstnameDirty: true,
                          firstname: _.get(this.state, 'firstname', '').trim()
                        })
                      }
                      onChange={e => {
                        const target = getCurrentInputElement(e)
                        this.setState({firstname: target.value});
                      }}
                      autoFocus={true}
                      id="first-name-light"
                      placeholder="First name"
                      style={{marginRight: 5}}
                    />

                    <input
                      onBlur={() =>
                        this.setState({
                          lastnameDirty: true,
                          lastname: _.get(this.state, 'lastname', '').trim()
                        })
                      }
                      onChange={e => {
                        const target = getCurrentInputElement(e)
                        this.setState({lastname: target.value});
                      }}
                      value={this.state.lastname || ''}
                      placeholder="Last name"
                      id="last-name-light"
                      style={{marginLeft: 5}}
                    />
                  </div>
                  {(this.state.answeredPrime ||
                    this.state.password ||
                    this.state.email ||
                    this.state.location) &&
                  (!this.state.firstname || !this.state.lastname) ? (
                    <span className="note error">Please add your first and last name</span>
                  ) : nameError ? (
                    <span className="note error">{nameError}</span>
                  ) : null}
                </div>
              </section>

              <section className="zipcode">
                <ZipCodeFormWrapper
                  tabIndex={null}
                  disableAutoFocus={true}
                  location={this.state.location}
                  onValidZipCode={this.setZipCode.bind(this)}
                  onInvalidZipCode={this.setZipCode.bind(this)}
                  disabledClick={disabledClick}
                  {...this.props}
                />
              </section>

              <section className="email">
                <AddEmail
                  disabledClick={disabledClick}
                  tabIndex={null}
                  setEmail={this.setEmail.bind(this)}
                  {...forwardProps}
                />
              </section>

              <section className="password">
                <AddPassword
                  disabledClick={disabledClick}
                  tabIndex={null}
                  setPassword={this.setPassword.bind(this)}
                  {...forwardProps}
                />
              </section>

              <section className="prime">
                <h5 className="label">Do you have Amazon Prime?</h5>
                <div className="prime-button-wrapper">
                  <div className="button-group">
                    <button
                      type="button"
                      onClick={this.amazonPrimeMembership.bind(this, true)}
                      tabIndex={null}
                      className={`${
                        this.state.hasPrime === true ? 'primary-btn-small' : 'secondary-btn-small'
                      }`}>
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={this.amazonPrimeMembership.bind(this, false)}
                      tabIndex={null}
                      className={`${
                        this.state.hasPrime === false ? 'primary-btn-small' : 'secondary-btn-small'
                      }`}>
                      No
                    </button>
                  </div>
                  {(this.state.password &&
                    this.state.email &&
                    this.state.location &&
                    !this.state.answeredPrime &&
                    this.state.agreedToTerms) ||
                  (!this.state.answeredPrime && disabledClick) ? (
                    <span style={{position: 'absolute', bottom: -27}} className="note error">
                      please select whether you have Amazon Prime or not.
                    </span>
                  ) : null}
                </div>
              </section>

              <section className="checkbox-group">
                <input
                  type="checkbox"
                  id={`terms`}
                  checked={!!this.state.agreedToTerms ? 'yes' : ''}
                  onClick={(e) => { // onChange not working?
                    this.setState({agreedToTerms: !this.state.agreedToTerms}, () => {
                      sendMetric('trackClick', 'termsAccept', 'checkbox', {
                        value: !this.state.agreedToTerms
                      });
                    });
                  }}
                />
                <label htmlFor={`terms`}>
                  <h5 style={{fontSize: '12px'}}>
                    <span className="light">I accept Wikibuy's </span>
                    <span>
                      <a
                        className="tertiary-link"
                        href="https://wikibuy.com/our-terms/terms-of-service"
                        target="_blank">
                        terms
                      </a>
                    </span>
                    <span className="light and"> and </span>
                    <span>
                      <a
                        className="light tertiary-link"
                        href="https://wikibuy.com/our-terms/privacy-policy"
                        target="_blank">
                        privacy policy.
                      </a>
                    </span>
                  </h5>
                </label>
              </section>

              <footer>
                <button
                  type="submit"
                  tabIndex={null}
                  disabled={
                    !this.state.answeredPrime ||
                    disabledDueToName ||
                    awaitingSave ||
                    !this.state.agreedToTerms ||
                    !this.state.password ||
                    !this.state.email
                  }
                  onClick={this.onSubmit.bind(this)}
                  className="primary-btn-large">
                  {awaitingSave ? (
                    <Loader light={true} scale={0.3} size={22} color={'#888888'}>
                    </Loader>
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

  amazonPrimeMembership(hasPrime) {
    this.setState({hasPrime, answeredPrime: true});
    sendMetric('trackClick', 'selectPrime', `${hasPrime ? 'yes' : 'no'}`, {
      view: 'extGate',
      prime: hasPrime
    });
    this.setState({primeResponseSuccessfullySet: true});
  }

  setZipCode(zipLocation) {
    this.setState({location: zipLocation});
  }

  setEmail(email) {
    this.setState({email});
  }

  setPassword(password) {
    this.setState({password});
  }

  async onSubmit(e) {
    e.preventDefault();
    if (!this.validSubmitOnEnter()) {
      return;
    }
    sendMetric('track', 'continueCreateAccount', {
      view: 'extGate',
      email: this.state.email,
      hasPrime: this.state.hasPrime,
      zipcode: _.get(this.state, 'location.zipcode')
    });

    const account = {
      email: this.state.email,
      password: this.state.password,
      hasPrime: this.state.hasPrime,
      firstname: this.state.firstname,
      lastname: this.state.lastname,
      zipcode: _.get(this.state, 'location.zipcode')
    };

    this.setState({awaitingSave: true});
    const response = await createAccount(account);
    this.setState({awaitingSave: false});

    // EVALUATRE TODO
    const existed = _.get(response, 'existed');
    if (existed) {
      sendMetric('track', 'loginFromExtGate');
    }

    if (!_.get(response, 'error')) {
      sendMetric('track', 'createAccount', {
        previousUserId: _.get(this.props, 'session.id'),
        view: 'extGate'
      });
      this.props.nextStep();
    } else {
      this.setState({error: _.get(response, 'error')});
    }
  }
}

export default GetStarted;
