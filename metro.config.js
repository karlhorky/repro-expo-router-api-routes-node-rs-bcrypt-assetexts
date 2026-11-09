const { getDefaultConfig } = require('expo/metro-config');

if (process.env.NATIVE_TRANSFORMER_WORKAROUND === '1') {
  module.exports = require('./metro.native-transformer.config.cjs');
} else if (process.env.NATIVE_EXTERNAL_TEST === '1') {
  module.exports = require('./metro.native-external-test.cjs');
} else {
  const config = getDefaultConfig(__dirname);
  config.resolver.assetExts.push('node');
  module.exports = config;
}
