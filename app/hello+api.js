import { hello } from '../native/build/Release/hello.node';

export function GET() {
  return Response.json({ message: hello() });
}
