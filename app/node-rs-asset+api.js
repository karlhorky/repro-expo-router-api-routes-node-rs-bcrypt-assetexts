import bcrypt from '@node-rs/bcrypt-darwin-arm64';

export function GET() {
  return Response.json({ type: typeof bcrypt, value: bcrypt });
}
