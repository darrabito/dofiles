import constants from '../bg/constants';
import analyticsJs from 'iv-analytics.js/analytics-wb-only';

let settings = {
  Wikibuy: {
    apiKey: constants.SEGMENT_KEY,
    apiHost: __ENV__ === 'prod' ? 'track.wikibuy.com' : 'track.ivf-stage.com',
    addBundledMetadata: true,
    unbundledIntegrations: []
  }
};

analyticsJs.initialize(settings);
window.analytics = analyticsJs;
