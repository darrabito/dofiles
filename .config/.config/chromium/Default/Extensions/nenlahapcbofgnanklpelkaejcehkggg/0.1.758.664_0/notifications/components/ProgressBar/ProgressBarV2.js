import {React} from 'utility/css-ns';
import './progress-bar.less';

class ProgressBarV2 extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      progress: 0
    };
  }

  componentDidMount() {
    this.startingInterval = setInterval(() => {
      const oldProgress = this.state.progress || 0;
      if (oldProgress >= 20) {
        clearInterval(this.startingInterval);
      }
      if (oldProgress < 20) {
        this.setState({progress: oldProgress + 1});
      }
    }, 250);
  }

  componentWillReceiveProps(nextProps) {
    const currentCodeIndex = nextProps.currentCodeIndexTigger
      ? nextProps.currentCodeIndexTigger + 1
      : 0;

    if (!this.props.complete && nextProps && nextProps.complete) {
      this.setState({progress: 100});
    }
    const newProgress = Math.floor((currentCodeIndex / nextProps.couponQtTigger) * 100);
    const oldProgress = this.state.progress || 0;
    if (newProgress && newProgress > oldProgress) {
      this.setState({progress: newProgress});
    }
  }
  render() {
    const {progress} = this.state;
    const scaledProgress = 10 + (progress / 100) * 90;
    const progressForRender = Math.min(scaledProgress, 100);
    return (
      <div
        id="progress-bar-wrapper"
        className={this.props.rounded ? 'rounded progress-bar' : 'progress-bar'}>
        <div className="progress" style={{width: `${progressForRender}%`}} />
      </div>
    );
  }
}

export default ProgressBarV2;
