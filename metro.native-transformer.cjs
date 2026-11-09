const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const transformer = require(getDefaultConfig(__dirname).transformer.babelTransformerPath);

module.exports = {
  ...transformer,
  transform(args) {
    if (args.filename.endsWith('.node') && args.options.customTransformOptions?.environment === 'node') {
      const filename = JSON.stringify(path.resolve(args.options.projectRoot, args.filename));
      return transformer.transform({
        ...args,
        src: `module.exports = require('node:module').createRequire(${filename})(${filename});`,
      });
    }
    return transformer.transform(args);
  },
};
