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

const bcryptResponse = await fetch('http://localhost:8107/bcrypt');
const bcryptBody = await bcryptResponse.text();
assert.equal(bcryptResponse.status, 500);
assert.ok(bcryptBody.includes('No native build was found'));
console.log('/bcrypt: HTTP 500, No native build was found');
