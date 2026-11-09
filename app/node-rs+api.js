import { hashSync } from '@node-rs/bcrypt-darwin-arm64';

export function GET() {
  const hash = hashSync('hello world', 4, undefined, undefined, false);
  return Response.json({ hash });
}
