import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import {fetchZipcode} from 'actions/accountActions';
import getCurrentInputElement from 'utility/getCurrentInputElement';
const zipCodeEscapedPattern = '^[0-9]{5}(?:-[0-9]{4})?$';

import './zip-code-form-wrapper.less';

class ZipCodeFormWrapper extends Component {
  constructor(...args) {
    super(...args);
    this.lastZip = null;
    this.state = {
      location: null,
      zipcode: null,
      zipcodeError: false
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps && !prevProps.isActive && this.props.isActive) {
      setTimeout(() => {
        this.refs.input.focus();
      }, 1000);
    }
  }

  render() {
    const state = this.props.location
      ? this.props.location.stateShort || this.props.location.state
      : '';
    const city = this.state.zipcodeError
      ? `— invalid zip code`
      : this.props.location
      ? `—${this.props.location.city}, ${state}`
      : '';
    return (
      <div
        className={`designed-form input-wrapper ${city ? 'animate-indent' : ''} ${
          this.state.zipcodeError ? 'error' : ''
        }`}>
        <input
          tabIndex={this.props.tabIndex}
          maxLength={5}
          value={this.state.zipcodeValue || ''}
          onChange={this.onChangeZipcode.bind(this)}
          placeholder="Enter Zip Code"
          autoFocus={this.props.disableAutoFocus ? false : true}
        />
        <span className="inner-input-text">{city}</span>
        {this.state.zipcodeValue ? (
          <div className="form-label">
            <h4>shipping zip code</h4>
          </div>
        ) : null}
        {this.state.zipcodeError || (this.props.disabledClick && !this.state.zipcodeValid) ? (
          <span style={{position: 'absolute', bottom: -27}} className="note error">
            please enter a valid US zip code.
          </span>
        ) : null}
      </div>
    );
  }

  onChangeZipcode(e) {
    const target = getCurrentInputElement(e);
    const zipcode = target.value;
    this.setState({zipcodeValue: zipcode});
    if (zipcode) {
      this.zipcodeChanged(zipcode.substr(0, 5));
    } else if (!zipcode && this.props.location) {
      this.props.onInvalidZipCode(false);
    } else if (!zipcode) {
      this.setState({zipcodeError: false, zipcodeValid: false});
    }
  }

  async zipcodeChanged(zipcode) {
    if (zipcode && zipcode.match(new RegExp(zipCodeEscapedPattern))) {
      this.lastZip = zipcode;
      try {
        const location = await fetchZipcode(zipcode);
        if (location && !location.error) {
          this.props.onValidZipCode(location);
          this.setState({zipcodeError: false, zipcodeValid: true});
        } else {
          throw new Error('');
        }
      } catch (err) {
        this.setState({zipcodeError: true, zipcodeValid: false});
        this.props.onInvalidZipCode(false);
      }
    } else {
      this.props.onInvalidZipCode(false);
    }
  }
}

export default ZipCodeFormWrapper;