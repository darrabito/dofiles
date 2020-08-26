import {React} from 'utility/css-ns';
import {Component} from 'react';
import sendMetric from 'utility/sendMetric';
import getCurrentInputElement from 'utility/getCurrentInputElement';

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

class AddEmail extends Component {
  constructor(...args) {
    super(...args);
    this.lastZip = null;
    this.state = {
      email: ''
    };
  }

  componentDidUpdate(prevProps, prevState) {
    const invalidButDirty =
      (!this.state.valid && this.state.dirty) || (!this.state.valid && this.props.disabledClick);
    const prevInvalidButDirty =
      (!prevState.valid && prevState.dirty) || (!prevState.valid && prevProps.disabledClick);
    if (invalidButDirty && !prevInvalidButDirty) {
      sendMetric('trackError', 'accountEmailFormError', 'invalid email');
    }
  }

  render() {
    return (
      <div
        className={`designed-form input-wrapper ${
          this.state.dirty && !this.state.valid ? 'error' : ''
        }`}>
        <input
          autoFocus={this.props.autoFocus}
          ref={ref => (this.emailRef = ref)}
          tabIndex={this.props.tabIndex}
          onBlur={this.onDirty.bind(this)}
          onChange={this.onChangeEmail.bind(this)}
          value={this.state.email || ''}
          placeholder="Enter Email"
          id="email-2"
        />
        {this.state.email ? (
          <div className="form-label">
            <h4>Enter Email</h4>
          </div>
        ) : null}
        {(this.state.dirty && !this.state.valid) ||
        (!this.state.valid && this.props.disabledClick) ? (
          <span style={{position: 'absolute', bottom: -27}} className="note error">
            Please enter a valid email address.
          </span>
        ) : null}
      </div>
    );
  }

  setActive(index) {
    this.setState({active: index});
  }

  onDirty(e) {
    const target = this.emailRef;
    const email = target.value;
    this.setState({dirty: this.hasChangedField, valid: this.validateEmail(email)});
    this.onChangeEmail(null, email);
  }

  onChangeEmail(e, value) {
    let target;
    if (e) {
      target = this.emailRef;
    }
    
    const email = target ? target.value : value;
    this.hasChangedField = email;
    const valid = this.validateEmail(email);
    this.setState({email, valid}, () => {
      if (valid) {
        this.props.setEmail(email);
      } else {
        this.props.setEmail(false);
      }
    });
  }

  validateEmail(email) {
    return emailRegex.test(email);
  }
}

export default AddEmail;