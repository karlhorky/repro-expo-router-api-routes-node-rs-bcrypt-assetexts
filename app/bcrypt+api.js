import bcrypt from 'bcrypt';

export function GET() {
  const hash = bcrypt.hashSync('hello world', 4);
  return Response.json({ hash, verified: bcrypt.compareSync('hello world', hash) });
}
