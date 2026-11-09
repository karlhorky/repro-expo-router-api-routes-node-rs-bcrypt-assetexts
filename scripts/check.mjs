import assert from 'node:assert/strict';

const nativeResponse = await fetch('http://localhost:8107/node-rs');
const nativeBody = await nativeResponse.text();
assert.equal(nativeResponse.status, 500);
assert.ok(nativeBody.includes('hashSync') && nativeBody.includes('is not a function'));
console.log('/node-rs: HTTP 500, hashSync is not a function');

const assetResponse = await fetch('http://localhost:8107/node-rs-asset');
assert.equal(assetResponse.status, 200);
const asset = await assetResponse.json();
assert.equal(asset.type, 'string');
assert.ok(asset.value.startsWith('/assets/'));
assert.ok(asset.value.endsWith('/bcrypt.darwin-arm64.node'));
console.log('/node-rs-asset: HTTP 200, ' + JSON.stringify(asset));

const helloResponse = await fetch('http://localhost:8107/hello');
const helloBody = await helloResponse.text();
assert.equal(helloResponse.status, 500);
assert.ok(helloBody.includes('hello') && helloBody.includes('is not a function'));
console.log('/hello: HTTP 500, hello is not a function');

const helloAssetResponse = await fetch('http://localhost:8107/hello-asset');
assert.equal(helloAssetResponse.status, 200);
const helloAsset = await helloAssetResponse.json();
assert.equal(helloAsset.type, 'string');
assert.ok(helloAsset.value.startsWith('/assets/'));
assert.ok(helloAsset.value.endsWith('/hello.node'));
console.log('/hello-asset: HTTP 200, ' + JSON.stringify(helloAsset));
