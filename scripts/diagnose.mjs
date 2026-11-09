import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

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
