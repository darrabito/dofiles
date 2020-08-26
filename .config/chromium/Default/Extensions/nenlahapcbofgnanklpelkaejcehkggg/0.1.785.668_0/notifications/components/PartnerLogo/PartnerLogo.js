import {React} from 'utility/css-ns';
import './partner-logo.less';

class PartnerLogo extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {};
  }

  componentWillMount() {
    this.preloadImage(this.props.domain);
  }

  preloadImage(domain, useImageAPI) {
    if (!domain) {
      this.onImageError();
      return;
    }

    const tryCropped = this.props.type === 'cropped' && !this.state.tryOriginalImage;
    let cdnFile = domain.replace(/\.com$|\.net$/, '');
    cdnFile = tryCropped ? `cropped/${cdnFile}_cropped` : cdnFile;

    const imageSrc = useImageAPI
      ? `https://images.wikibuy.com/api/v1/logos?domain=${domain}&width=300&height=300`
      : `https://cdn.ivaws.com/wikibuy-assets/images/merchant-logos/edit/${cdnFile}.png`;
    this.image = new Image();
    this.image.addEventListener('load', () => this.onImageLoad(imageSrc));
    this.image.addEventListener('error', () => {
      if (useImageAPI) {
        this.onImageError();
      } else {
        this.preloadImage(domain, true);
      }
    });
    this.image.src = imageSrc;
    this.imageSrc = imageSrc;
  }

  render() {
    const {cursor, autocoup} = this.props;
    const {image, error} = this.state;
    return (
      <div
        style={
          autocoup
            ? {minHeight: '150px'}
            : !image && !error && this.props.imageCached
            ? {minHeight: '60px'}
            : {}
        }
        className="partner-logo-component partner-logo-wrapper">
        {error ? (
          <div
            className="partner-logo placeholder"
            style={{
              backgroundImage: 'url("https://cdn.ivaws.com/wikibuy-assets/images/wb_credits.svg")',
              cursor
            }}
          />
        ) : this.props.useImgTag && (image || this.props.imageCached) ? (
          <img
            className="partner-logo-img success"
            src={this.props.imageCached ? this.imageSrc : image ? image : ''} // used to hold placeholder
            style={{cursor}}
          />
        ) : image ? (
          <div
            className="partner-logo success"
            style={{backgroundImage: `url("${image}")`, cursor}}
          />
        ) : (
          <div className="partner-logo pad" />
        )}
      </div>
    );
  }

  onImageLoad(imageSrc) {
    this.setState({image: imageSrc});
  }

  onImageError() {
    if (this.props.type === 'cropped' && !this.state.tryOriginalImage) {
      this.setState({tryOriginalImage: true}, () => {
        this.preloadImage(this.props.domain);
      });
    } else {
      this.setState({error: true});
    }
  }
}

PartnerLogo.defaultProps = {
  cursor: 'auto'
};

export default PartnerLogo;
