const native = require('@node-rs/bcrypt-darwin-arm64');
const hello = require('../native/build/Release/hello.node');

const hash = native.hashSync('hello world', 4, undefined, undefined, false);
console.log(JSON.stringify({ module: '@node-rs/bcrypt-darwin-arm64', hash, verified: native.verifySync('hello world', hash) }));
console.log(JSON.stringify({ module: 'hello.node', message: hello.hello() }));
