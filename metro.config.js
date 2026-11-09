const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('node');

module.exports = config;

if (process.env.NATIVE_EXTERNAL_TEST === '1') {
  module.exports = require('./metro.native-external-test.cjs');
}
