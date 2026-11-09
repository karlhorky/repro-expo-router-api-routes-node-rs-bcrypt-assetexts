import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const bundleUrl = 'http://localhost:8107/app/hello+api.bundle?platform=web&dev=true&minify=false&transform.environment=node&transform.engine=hermes';
const bundleResponse = await fetch(bundleUrl);
assert.equal(bundleResponse.status, 200);
const bundle = await bundleResponse.text();
const exportIndex = bundle.indexOf('module.exports = "/assets/?unstable_path=.%2Fnative%2Fbuild%2FRelease/hello.node";');
assert.notEqual(exportIndex, -1);
const moduleStart = bundle.lastIndexOf('__d(', exportIndex);
const moduleEnd = bundle.indexOf('\n', bundle.indexOf('"native/build/Release/hello.node");', exportIndex));
const generatedModule = bundle.slice(moduleStart, moduleEnd);
await writeFile('logs/hello-generated-module.txt', generatedModule + '\n');
console.log('Node-environment bundle URL: ' + bundleUrl);
console.log(generatedModule);

const assetResponse = await fetch('http://localhost:8107/hello-asset');
assert.equal(assetResponse.status, 200);
const asset = await assetResponse.json();
const binaryResponse = await fetch(new URL(asset.value, 'http://localhost:8107'));
assert.equal(binaryResponse.status, 200);
const servedHash = createHash('sha256').update(Buffer.from(await binaryResponse.arrayBuffer())).digest('hex');
const localHash = createHash('sha256').update(await readFile('native/build/Release/hello.node')).digest('hex');
assert.equal(servedHash, localHash);
console.log('Asset HTTP status: ' + binaryResponse.status);
console.log('Served SHA-256: ' + servedHash);
console.log('Local SHA-256:  ' + localHash);

const nativeResponse = await fetch('http://localhost:8107/native-require');
assert.equal(nativeResponse.status, 200);
const native = await nativeResponse.json();
assert.equal(native.message, 'hello from native');
assert.equal(native.verified, true);
console.log('/native-require: HTTP 200, ' + JSON.stringify(native));

const projectRequire = createRequire(import.meta.url);
const expoRequire = createRequire(projectRequire.resolve('expo/package.json'));
const metroRequire = createRequire(expoRequire.resolve('@expo/metro-config/package.json'));
const { transformToSource } = metroRequire('./build/transform-worker/asset-transformer.js');
const config = projectRequire('../metro.config.js');
const transformed = await transformToSource({
  filename: 'native/build/Release/hello.node',
  options: {
    platform: 'web',
    projectRoot: process.cwd(),
    publicPath: '/assets/?unstable_path=.',
    customTransformOptions: { environment: 'node' },
  },
}, config.transformer.assetRegistryPath, config.transformer.assetPlugins);
assert.ok(generatedModule.includes(transformed.code));
console.log('assetExts includes node: ' + config.resolver.assetExts.includes('node'));
console.log('sourceExts includes node: ' + config.resolver.sourceExts.includes('node'));
console.log('Expo asset transformer with platform=web, environment=node: ' + transformed.code);
const transformerSource = await readFile(metroRequire.resolve('./build/transform-worker/asset-transformer.js'), 'utf8');
await writeFile('logs/transformer-source.txt', transformerSource.split('\n').slice(59, 111).map((line, index) => `${index + 60}: ${line}`).join('\n') + '\n');

const esmImport = "import { hello } from './native/build/Release/hello.node'; console.log(hello());";
const esmResult = spawnSync(process.execPath, ['--input-type=module', '--eval', esmImport], { encoding: 'utf8' });
assert.equal(esmResult.status, 1);
assert.ok(esmResult.stderr.includes('ERR_UNKNOWN_FILE_EXTENSION'));
const commonjsImport = "import addon from './native/hello-commonjs.cjs'; console.log(addon.hello());";
const commonjsResult = spawnSync(process.execPath, ['--input-type=module', '--eval', commonjsImport], { encoding: 'utf8' });
assert.equal(commonjsResult.status, 0);
assert.equal(commonjsResult.stdout.trim(), 'hello from native');
const nodeLoader = projectRequire('node:module')._extensions['.node'].toString();
await writeFile('logs/node-loader.txt',
  '$ node --input-type=module --eval ' + JSON.stringify(esmImport) + '\n' +
  esmResult.stderr.replaceAll(process.cwd(), '<repro>') + '\n' +
  '$ node --input-type=module --eval ' + JSON.stringify(commonjsImport) + '\n' + commonjsResult.stdout + '\n' +
  "Node's installed CommonJS .node extension handler:\n" + nodeLoader + '\n');
console.log('Plain Node direct ESM import: ERR_UNKNOWN_FILE_EXTENSION');
console.log('Plain Node import of CommonJS wrapper: ' + commonjsResult.stdout.trim());
const commonjsResponse = await fetch('http://localhost:8107/hello-commonjs');
assert.equal(commonjsResponse.status, 500);
const commonjsBody = await commonjsResponse.text();
assert.ok(commonjsBody.includes('hello') && commonjsBody.includes('is not a function'));
console.log('/hello-commonjs: HTTP 500, addon.default.hello is not a function');
const commonjsBundleResponse = await fetch('http://localhost:8107/app/hello-commonjs+api.bundle?platform=web&dev=true&minify=false&transform.environment=node&transform.engine=hermes');
assert.equal(commonjsBundleResponse.status, 200);
const commonjsBundle = await commonjsBundleResponse.text();
const commonjsExport = commonjsBundle.indexOf('module.exports = require(_dependencyMap[0], "./build/Release/hello.node");');
assert.notEqual(commonjsExport, -1);
const commonjsStart = commonjsBundle.lastIndexOf('__d(', commonjsExport);
const commonjsEnd = commonjsBundle.indexOf('\n', commonjsBundle.indexOf('"native/hello-commonjs.cjs");', commonjsExport));
await writeFile('logs/commonjs-generated-module.txt', commonjsBundle.slice(commonjsStart, commonjsEnd) + '\n');
