const native = require('@node-rs/bcrypt-darwin-arm64');
const bcrypt = require('bcrypt');

const nativeHash = native.hashSync('hello world', 4, undefined, undefined, false);
console.log(JSON.stringify({ module: '@node-rs/bcrypt-darwin-arm64', hash: nativeHash, verified: native.verifySync('hello world', nativeHash) }));

const bcryptHash = bcrypt.hashSync('hello world', 4);
console.log(JSON.stringify({ module: 'bcrypt', hash: bcryptHash, verified: bcrypt.compareSync('hello world', bcryptHash) }));
