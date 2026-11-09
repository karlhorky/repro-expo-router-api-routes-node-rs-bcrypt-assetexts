const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('node');

mkdirSync(path.join(__dirname, '.expo', 'native-external'), { recursive: true });
for (const filename of [path.join(__dirname, 'native/build/Release/hello.node'), require.resolve('@node-rs/bcrypt-darwin-arm64')]) {
  const shim = path.join(__dirname, '.expo', 'native-external', path.basename(filename) + '.cjs');
  writeFileSync(shim, 'module.exports = $$require_external(' + JSON.stringify(filename) + ');\n');
}

config.resolver.resolveRequest = function resolveRequest(context, moduleName, platform) {
  const resolution = context.resolveRequest(context, moduleName, platform);
  if (context.customResolverOptions.environment === 'node' && resolution.type === 'assetFiles' && resolution.filePaths[0].endsWith('.node')) {
    const filename = resolution.filePaths[0];
    const shim = path.join(__dirname, '.expo', 'native-external', path.basename(filename) + '.cjs');
    console.log(JSON.stringify({ moduleName, originalResolution: resolution.type, filename: path.relative(__dirname, filename), replacement: 'Node.js require' }));
    return { type: 'sourceFile', filePath: shim };
  }
  return resolution;
};

module.exports = config;
