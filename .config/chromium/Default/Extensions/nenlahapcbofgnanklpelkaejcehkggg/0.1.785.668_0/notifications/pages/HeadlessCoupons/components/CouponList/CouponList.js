import {React} from 'utility/css-ns';
import {Component} from 'react';
import _ from 'lodash';
import copyToClip from 'utility/copyToClip';
import sendMetric from 'utility/sendMetric';
import './coupon-list.less';

class CouponListItem extends Component {
  constructor(...args) {
    super(...args);
    this.state = {
      copied: false
    };
  }

  render() {
    const coupon = this.props.coupon;
    return (
      <div
        className={`coupon-item-wrapper ${this.props.active ? 'active' : ''} ${
          coupon.success ? 'success' : 'finished'
        } ${this.state.copied ? 'copied' : ''}`}>
        <div className="coupon-list-item-container" onClick={this.onClickCopy.bind(this)}>
          <div className="details">
            <h4 className="code midnight bold">{coupon.code}</h4>
          </div>
        </div>
      </div>
    );
  }
  onClickCopy() {
    this.setState({copied: copyToClip(this.props.coupon.code)}, () => {
      this.timeoutId = setTimeout(() => {
        this.setState({copied: false});
      }, 1000);
    });
    sendMetric('trackClick', 'copyCouponCode', 'code', {
      domain: location.hostname.replace(/^www\./, ''),
      pagePath: location.pathname
    });
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutId);
  }
}

export default class CouponList extends Component {
  constructor(...args) {
    super(...args);
    let startingActiveIndex = 0;
    if (this.props.currentCodeIndex > -1) {
      startingActiveIndex = this.props.currentCodeIndex;
    }
    this.state = {
      active: startingActiveIndex
    };
  }

  componentDidMount() {
    this.startInterval();
  }

  startInterval() {
    const interval =
      this.props.runTimePerCoupon ||
      (this.props.estimatedRunTime + 1000) / this.props.coupons.length;
    this.interval = setInterval(() => {
      const na = this.state.active + 1;
      this.setState({active: na});
      if (na === this.props.coupons.length - 1) {
        clearInterval(this.interval);
      }
    }, interval);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const style = {
      WebkitTransform: `translate3d(0px, -${(this.state.active - 4) * 40}px, 0px)`,
      transform: `translate3d(0px, -${(this.state.active - 4) * 40}px, 0px)`,
      msTransform: `translate3d(0px, -${(this.state.active - 4) * 40}px, 0px)`,
      WebkitTransition: '-webkit-transform 0.3ms ease',
      transition: 'transform 0.3s ease'
    };
    return (
      <div className="code-list-wrapper">
        <div
          style={this.state.active > 4 ? style : {}}
          className={`code-list ${this.props.className || ''}`}>
          {_.map(this.props.coupons, (coupon, i) => {
            return (
              <CouponListItem key={i} index={i} active={this.state.active === i} coupon={coupon} />
            );
          })}
        </div>
      </div>
    );
  }
}
