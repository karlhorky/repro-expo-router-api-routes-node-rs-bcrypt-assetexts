import assert from 'node:assert/strict';

for (const route of ['hello', 'node-rs', 'hello-commonjs']) {
  const response = await fetch('http://localhost:8107/' + route);
  const body = await response.json();
  assert.equal(response.status, 200);
  if (route === 'node-rs') {
    assert.ok(body.hash.startsWith('$2b$04$'));
  } else {
    assert.equal(body.message, 'hello from native');
  }
  console.log(JSON.stringify({ route, status: response.status, body }));
}
