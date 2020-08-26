import {React} from 'utility/css-ns';
import {Component} from 'react';
import sendMetric from 'utility/sendMetric';
import getCurrentInputElement from 'utility/getCurrentInputElement';

class AddPassword extends Component {
  constructor(...args) {
    super(...args);
    this.state = {};
  }

  componentDidUpdate(prevProps, prevState) {
    const invalidButDirty =
      (!this.state.valid && this.state.dirty) || (!this.state.valid && this.props.disabledClick);
    const prevInvalidButDirty =
      (!prevState.valid && prevState.dirty) || (!prevState.valid && prevProps.disabledClick);
    if (invalidButDirty && !prevInvalidButDirty) {
      sendMetric('trackError', 'accountPasswordFormError', 'password length');
    }
  }

  render() {
    return (
      <div
        className={`designed-form input-wrapper ${
          this.state.dirty && !this.state.valid ? 'error' : ''
        }`}>
        <input
          type="password"
          ref={ref => (this.passwordRef = ref)}
          tabIndex={this.props.tabIndex}
          onBlur={this.onDirty.bind(this)}
          onChange={this.onChangePassword.bind(this)}
          placeholder={this.props.placeholder || 'Create Password'}
          id="password"
        />
        {this.state.password ? (
          <div className="form-label">
            <h4>{this.props.placeholder || 'Create Password'}</h4>
          </div>
        ) : null}
        {(!this.state.valid && this.state.dirty) ||
        (!this.state.valid && this.props.disabledClick) ? (
          <span style={{position: 'absolute', bottom: -27}} className="note error">
            Passwords require 6 or more characters.
          </span>
        ) : null}
      </div>
    );
  }

  onDirty(e) {
    const target = this.passwordRef;
    const password = target.value;
    this.setState({dirty: true, valid: this.validatePassword(password)});
    this.onChangePassword(null, password);
  }

  onChangePassword(e, value) {
    let target;
    if (e) {
      target = this.passwordRef;
    }
    const password = target ? target.value : value;

    const valid = this.validatePassword(password);
    if (valid) {
      this.props.setPassword(password);
    } else {
      this.props.setPassword(false);
    }
    this.setState({password, valid});
    this.startTimer(valid);
  }

  validatePassword(password) {
    return password.length >= 6;
  }

  startTimer(valid) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.setState({dirty: true, valid});
    }, 3000);
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }
}

export default AddPassword;