const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('node');
config.transformer.babelTransformerPath = require.resolve('./metro.native-transformer.cjs');

module.exports = config;
