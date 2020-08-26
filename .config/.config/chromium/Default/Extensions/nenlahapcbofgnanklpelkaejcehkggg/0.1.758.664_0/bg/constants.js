let constants = {};

if (__ENV__ === 'local') {
  constants = {
    SEGMENT_KEY: '76Bk8BDfJu5SPmaXzFj9UfcRwpcdbiUD',
    SITE_API: 'https://site.ivf-dev.com/v2',
    SITE_API_V3: 'https://site.ivf-dev.com/v3',
    WIKIBUY_API: 'http://api.ivf-local.com:3000/v1',
    WIKIBUY_URL: 'http://ivf-local.com:3000',
    WIKIBUY_HOST: 'ivf-local.com',
    WIKIBUY_HOTELS_API: 'http://localhost:7443',
    WIKIBUY_HOTELS_URL: 'https://localhost:3000/hotels',
    INSTANT_URL: 'https://instant.ivf-dev.com/v1',
    LOGGER_URL: 'http://client-logger-api.dev.ivaws.com/log',
    INSTANT_URL_V2: 'https://instant.ivf-dev.com/v2',
    INSTANT_URL_V2_BASE: 'https://instant.ivf-dev.com',
    FEEDBACK_BASE: 'http://feedback.dev.ivaws.com/api/v1/',
    SESSION_COOKIE: 'wb_session_dev',
    RPC_CHECKIN_INTERVAL: 1000 * 60 * 60 * 1,
    ACCOUNT_SERVICE_URL: 'http://accounts.dev.ivaws.com',
    SS_ENV: 'dev',
    CLIENT_LOGGER_URL: 'https://wb-client-logger-api.clouddqt.capitalone.com/log'
  };
} else if (__ENV__ === 'dev') {
  constants = {
    SEGMENT_KEY: '76Bk8BDfJu5SPmaXzFj9UfcRwpcdbiUD',
    SITE_API: 'https://site.ivf-dev.com/v2',
    SITE_API_V3: 'https://site.ivf-dev.com/v3',
    WIKIBUY_API: 'https://api.ivf-dev.com/v1',
    WIKIBUY_URL: 'https://ivf-dev.com',
    WIKIBUY_HOST: 'ivf-dev.com',
    WIKIBUY_HOTELS_API: 'https://wb-hotels.clouddqt.capitalone.com',
    WIKIBUY_HOTELS_URL: 'https://hotels.ivf-stage.com',
    INSTANT_URL: 'https://instant.ivf-dev.com/v1',
    LOGGER_URL: 'http://client-logger-api.dev.ivaws.com/log',
    INSTANT_URL_V2: 'https://instant.ivf-dev.com/v2',
    INSTANT_URL_V2_BASE: 'https://instant.ivf-dev.com',
    FEEDBACK_BASE: 'http://feedback.dev.ivaws.com/api/v1/',
    SESSION_COOKIE: 'wb_session_dev',
    RPC_CHECKIN_INTERVAL: 1000 * 60 * 60 * 1,
    ACCOUNT_SERVICE_URL: 'http://accounts.dev.ivaws.com',
    SS_ENV: 'dev',
    CLIENT_LOGGER_URL: 'http://client-logger-api.dev.ivaws.com/log'
  };
} else if (__ENV__ === 'stage') {
  constants = {
    SEGMENT_KEY: '76Bk8BDfJu5SPmaXzFj9UfcRwpcdbiUD',
    SITE_API: 'https://site.ivf-stage.com/v2',
    SITE_API_V3: 'https://site.ivf-stage.com/v3',
    WIKIBUY_API: 'https://api.ivf-stage.com/v1',
    WIKIBUY_URL: 'https://ivf-stage.com',
    WIKIBUY_HOST: 'ivf-stage.com',
    WIKIBUY_HOTELS_API: 'https://wb-hotels.clouddqt.capitalone.com',
    WIKIBUY_HOTELS_URL: 'https://hotels.ivf-stage.com',
    INSTANT_URL: 'https://instant.ivf-stage.com/v1',
    LOGGER_URL: 'https://wb-client-logger-api.clouddqt.capitalone.com/log',
    INSTANT_URL_V2: 'https://instant.ivf-stage.com/v2',
    INSTANT_URL_V2_BASE: 'https://instant.ivf-stage.com',
    FEEDBACK_BASE: 'https://wb-iv-feedback-api.clouddqt.capitalone.com/api/v1/',
    SESSION_COOKIE: 'wb_session_stage',
    RPC_CHECKIN_INTERVAL: 1000 * 60 * 60 * 1,
    ACCOUNT_SERVICE_URL: 'https://wb-accounts.clouddqt.capitalone.com',
    SS_ENV: 'stage',
    CLIENT_LOGGER_URL: 'https://wb-client-logger-api.clouddqt.capitalone.com/log'
  };
} else {
  constants = {
    SEGMENT_KEY: 'hoJ2AjJaErOjhma79jutVyqhc4P25Rxc',
    SITE_API: 'https://site.wikibuy.com/v2',
    SITE_API_V3: 'https://site.wikibuy.com/v3',
    WIKIBUY_API: 'https://wikibuy.com/api/v1',
    WIKIBUY_URL: 'https://wikibuy.com',
    WIKIBUY_HOST: 'wikibuy.com',
    WIKIBUY_HOTELS_API: 'https://hotels-api.wikibuy.com',
    WIKIBUY_HOTELS_URL: 'https://hotels.wikibuy.com',
    INSTANT_URL: 'https://instant.wikibuy.com/v1',
    LOGGER_URL: 'http://client-logger-api.ivaws.com/log',
    INSTANT_URL_V2: 'https://instant.wikibuy.com/v2',
    INSTANT_URL_V2_BASE: 'https://instant.wikibuy.com',
    FEEDBACK_BASE: 'http://feedback.ivaws.com/api/v1/',
    SESSION_COOKIE: 'wb_session',
    RPC_CHECKIN_INTERVAL: 1000 * 60 * 60 * 1,
    ACCOUNT_SERVICE_URL: 'https://accounts.ivaws.com',
    SS_ENV: 'prod',
    CLIENT_LOGGER_URL: 'http://client-logger-api.ivaws.com/log'
  };
}

constants.BG_SCRIPT_SOURCE = '__wikibuy_bg';
constants.CONTENT_SCRIPT_SOURCE = '__wikibuy_content';
constants.EXTERNAL_MESSAGING_PORT_NAME = '__wikibuy_external_messages';

constants.BG_INSTANT_SOURCE = '__wikibuy_instant_bg';
constants.CONTENT_INSTANT_SOURCE = '__wikibuy_instant_content';
constants.INSTANT_MESSAGING_PORT_NAME = '__wikibuy_instant_external_messages';

module.exports = constants;
