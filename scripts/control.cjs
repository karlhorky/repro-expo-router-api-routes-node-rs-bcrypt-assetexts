const native = require('@node-rs/bcrypt-darwin-arm64');
const bcrypt = require('bcrypt');

const nativeHash = native.hashSync('hello world', 4, undefined, undefined, false);
console.log(JSON.stringify({ module: '@node-rs/bcrypt-darwin-arm64', hash: nativeHash, verified: native.verifySync('hello world', nativeHash) }));

const bcryptHash = bcrypt.hashSync('hello world', 4);
console.log(JSON.stringify({ module: 'bcrypt', hash: bcryptHash, verified: bcrypt.compareSync('hello world', bcryptHash) }));

const hello = require('../native/build/Release/hello.node');
console.log(JSON.stringify({ module: 'hello.node', message: hello.hello() }));
