import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import Loader from 'components/Loader';
import sendMetric from 'utility/sendMetric';
import {addName} from 'actions/accountActions';
import isFirstLastNameValid from 'utility/isFirstLastNameValid';
import getCurrentInputElement from 'utility/getCurrentInputElement';

import './add-name.less';

class AddName extends Component {
  constructor(...args) {
    super(...args);
    this.state = {};
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
    const disabledClick = this.state.disabledClick;

    let nameError = this.hasNameError(this.state);
    const disabledDueToName = !this.state.firstname || !this.state.lastname || nameError;

    return (
      <div className={`add-name`}>
        <form>
          <div className="add-name-wrapper">
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
                  {nameError ? <span className="note error">{nameError}</span> : null}
                </div>
              </section>

              <footer>
                <button
                  type="submit"
                  tabIndex={null}
                  disabled={awaitingSave || disabledDueToName}
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

                {error ? <p className="error">{error}</p> : null}
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
      firstname: !!this.state.firstname,
      lastname: !!this.state.lastname
    };
    sendMetric('trackClick', 'disabledButtonClick', 'continue', {
      name: 'add_name',
      validation: JSON.stringify(obj)
    });
    this.setState({disabledClick: true});
  }

  async onSubmit() {
    if (!this.state.firstname || !this.state.lastname || this.hasNameError(this.state)) {
      return;
    }

    sendMetric('trackClick', 'submitAddName', 'continue', {
      view: 'extGate'
    });

    const account = {
      firstname: this.state.firstname,
      lastname: this.state.lastname
    };

    this.setState({awaitingSave: true});
    const {success, error} = await addName(account);
    this.setState({awaitingSave: false});
    if (success) {
      this.props.nextStep();
    } else if (error) {
      this.setState({error});
    }
  }
}

export default AddName;