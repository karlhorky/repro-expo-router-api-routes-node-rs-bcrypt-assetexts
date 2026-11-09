import addon from '../native/hello-commonjs.cjs';

export function GET() {
  return Response.json({ message: addon.hello() });
}
