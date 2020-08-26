import _ from 'lodash';
import getUser from 'messenger/outbound/getUser';

let features = [];

const themes = {
  cBlue: {
    primary: '#255F82',
    accentDark: '#10253F',
    accentLight: '#F2FAFD',
    buttonActive: '#013D5B',
    buttonHover: '#598AAA'
  },
  iBlue: {
    primary: '#0276B1',
    accentDark: '#013D58',
    accentLight: '#F0FAFF',
    buttonActive: '#0397E3',
    buttonHover: '#3ABCFD'
  },
  cRed: {
    primary: '#CC2427',
    accentDark: '#A3282B',
    accentLight: '#FEF7F6',
    buttonActive: '#E05752',
    buttonHover: '#EC837A'
  },
  cGreen: {
    primary: '#008140',
    accentDark: '#005128',
    accentLight: '#F8FAF7',
    buttonActive: '#59A545',
    buttonHover: '#7BB475'
  },
  lBlue: {
    primary: '#00AFD4',
    accentDark: '#007F9B',
    accentLight: '#F2FAFD',
    buttonActive: '#4BC7E7',
    buttonHover: '#78D0EB'
  }
};
const featureMappings = {
  palette_navy_blue: themes.cBlue,
  palette_int_blue: themes.iBlue,
  palette_red: themes.cRed,
  palette_green: themes.cGreen,
  palette_light_blue: themes.lBlue
};

const colorFeaturesArr = _.keys(featureMappings);

async function changeColors(css) {
  try {
    if (features.length === 0) {
      const user = await getUser();
      features = _.get(user, 'session.features') || [];
    }
    const alternateColorFeature = _.find(features, feature => {
      return colorFeaturesArr.includes(feature);
    });
    if (!alternateColorFeature) {
      return css;
    }
    const theme = featureMappings[alternateColorFeature];
    const {primary, buttonActive, accentDark, accentLight, buttonHover} = theme;
    const colorMappings = [
      {
        regex: /#01c049|#00C646|#00c049/gi, // palmetto | ? | %back amzn
        newColor: primary
      },
      {
        regex: /#00e76d/gi, // lime, e.g. try codes hover
        newColor: buttonActive
      },
      {
        regex: /#98f5c4/gi, // sage, e.g. continue to checkout hover
        newColor: buttonHover
      },
      {
        regex: /#00A224|#00992f|#1A8740|#00771b/gi, // mini-cashback | pipe | ? | mini-cashback x
        newColor: accentDark
      },
      {
        regex: /rgba\(0, ?198, ?70, ?0?.05\)|rgba\(1, ?192, ?73, ?0?.1\)/gi, // fade(#00C646, 5%); | ?
        newColor: accentLight
      }
    ];
    let changedCss = css;
    _.forEach(colorMappings, ({regex, newColor}) => {
      if (newColor) {
        changedCss = changedCss.replace(regex, newColor);
      }
    });
    return changedCss;
  } catch (e) {
    return css;
  }
}

export default changeColors;
