import { createRequire } from 'node:module';

export function GET() {
  const nodeRequire = createRequire(`${process.cwd()}/package.json`);
  const hello = nodeRequire('./native/build/Release/hello.node');
  const bcrypt = nodeRequire('@node-rs/bcrypt-darwin-arm64');
  const hash = bcrypt.hashSync('hello world', 4, undefined, undefined, false);

  return Response.json({
    message: hello.hello(),
    hash,
    verified: bcrypt.verifySync('hello world', hash),
  });
}
