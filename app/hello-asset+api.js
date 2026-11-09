import hello from '../native/build/Release/hello.node';

export function GET() {
  return Response.json({ type: typeof hello, value: hello });
}
