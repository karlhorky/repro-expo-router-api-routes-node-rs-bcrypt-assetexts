# Native addon imports in Expo Router API Routes with `assetExts`

Reproduction for https://github.com/react/metro/issues/1377#issuecomment-2440121091

Adding `node` to Metro's `resolver.assetExts` makes native addon imports bundle, but Expo's asset transformer exports a URL string instead of loading the Node-API addon. This repro tests a tiny `hello.node` addon and the direct `@node-rs/bcrypt-darwin-arm64` package from the original issue.

## Reproduce

Requires macOS on Apple Silicon, Python, and Xcode Command Line Tools. The platform-specific bcrypt dependency intentionally matches the original issue. No database, credentials, device, or mobile build is needed.

```sh
git clone https://github.com/karlhorky/repro-expo-router-api-routes-node-rs-bcrypt-assetexts.git
cd repro-expo-router-api-routes-node-rs-bcrypt-assetexts
pnpm install --frozen-lockfile
pnpm build-addon
pnpm control
pnpm start
```

In another terminal:

```sh
pnpm check
pnpm diagnose
```

`pnpm check` asserts the observed failures, so passing means the problem was reproduced. `pnpm diagnose` captures the generated native asset module, compares the served and local binary hashes, invokes Expo's asset transformer directly, verifies native loading inside the Expo API server, and compares a CommonJS wrapper in plain Node and Metro.

Configuration under test:

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('node');

module.exports = config;
```

`node` is in `assetExts`, not `sourceExts`.

## Expected and observed results

Expected: `/hello` returns `{"message":"hello from native"}` and `/node-rs` returns a bcrypt hash, both with HTTP 200. Both routes bundle, then fail when their handlers call the imported native function:

| Request | HTTP status | Observed result |
| --- | --- | --- |
| `/hello` | 500 | `hello` is not a function |
| `/hello-asset` | 200 | Imported default value is a string asset URL |
| `/node-rs` | 500 | `hashSync` is not a function |
| `/node-rs-asset` | 200 | Imported default value is a string asset URL |
| `/native-require` | 200 | Both addons load and execute using Node's `createRequire()` |
| `/hello-commonjs` | 500 | The same CommonJS wrapper that works in plain Node receives the asset URL in Metro |

The exact handler errors are:

```text
Metro error: (0 , _nativeBuildReleaseHelloNode.hello) is not a function
  GET (app/hello+api.js:4:40)

Metro error: (0 , _nodeRsBcryptDarwinArm.hashSync) is not a function
  GET (app/node-rs+api.js:4:24)
```

[logs/check.txt](logs/check.txt) records the HTTP assertions. [logs/metro.txt](logs/metro.txt) records the Metro output, with ANSI colors removed and the absolute repro directory replaced by `<repro>`.

## Diagnostics

### Node and Metro use different loaders for the same CommonJS wrapper

Direct ES module imports of `.node` files also fail in plain Node, with `ERR_UNKNOWN_FILE_EXTENSION`. The original direct-import routes therefore do not establish parity with Node's ES module loader.

The supported Node comparison uses `native/hello-commonjs.cjs`:

```js
module.exports = require('./build/Release/hello.node');
```

The same ES module import of this wrapper succeeds in plain Node:

```sh
$ node --input-type=module --eval "import addon from './native/hello-commonjs.cjs'; console.log(addon.hello());"
hello from native
```

Node's installed CommonJS `.node` extension handler calls `process.dlopen(module, filename)`. [logs/node-loader.txt](logs/node-loader.txt) captures both Node tests and the installed handler's source.

In the API Route `/hello-commonjs`, Metro bundles that wrapper as:

```js
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  module.exports = require(_dependencyMap[0], "./build/Release/hello.node");
},1,[2],"native/hello-commonjs.cjs");
```

Here `require` is the bundle's dependency loader, and its dependency is the generated asset module exporting a URL. It never reaches Node's `.node` extension handler. The route returns HTTP 500 with `addon.default.hello is not a function`.

[logs/commonjs-generated-module.txt](logs/commonjs-generated-module.txt) captures the generated wrapper, and [logs/commonjs-metro.txt](logs/commonjs-metro.txt) captures the HTTP request's server error. `pnpm diagnose` asserts the plain Node success, direct ESM failure, and bundled wrapper failure.

This explains why adding `assetExts` does not reproduce Node's native loading behavior: it selects the asset pipeline, which creates a JavaScript module, rather than delegating the dependency to Node's native loader. The transformer line below identifies where the URL is generated, but does not by itself establish that Expo's asset handling is defective.

### 1. The binary becomes a URL during asset transformation

`native/hello.c` exports one function, `hello()`, returning `"hello from native"`. It has no bcrypt dependency or third-party native loader. `pnpm build-addon` compiles it locally with `node-gyp`, and `app/hello+api.js` imports `native/build/Release/hello.node` directly.

`pnpm diagnose` requests this Metro bundle with the Node environment explicitly selected:

```text
http://localhost:8107/app/hello+api.bundle?platform=web&dev=true&minify=false&transform.environment=node&transform.engine=hermes
```

The generated module contains a string export, with no native loading call:

```js
__d(function (global, require, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {
  "use strict";

  module.exports = "/assets/?unstable_path=.%2Fnative%2Fbuild%2FRelease/hello.node";
},4,[],"native/build/Release/hello.node");
```

The complete extracted module is in [logs/hello-generated-module.txt](logs/hello-generated-module.txt).

### 2. The asset URL serves the original binary

The diagnostic route returns:

```json
{"type":"string","value":"/assets/?unstable_path=.%2Fnative%2Fbuild%2FRelease/hello.node"}
```

`pnpm diagnose` fetches that URL, asserts HTTP 200, and asserts its SHA-256 matches `native/build/Release/hello.node`. The observed hashes and responses are in [logs/diagnose.txt](logs/diagnose.txt). The binary is available, but importing it produces the URL rather than its exports.

### 3. Expo's asset transformer returns this exact export for the Node environment

The script directly invokes the installed `@expo/metro-config@58.0.20` function `transformToSource()` with `platform: 'web'`, `customTransformOptions: { environment: 'node' }`, and the dev server's `publicPath: '/assets/?unstable_path=.'`. Its returned code matches the generated module's export exactly.

In `build/transform-worker/asset-transformer.js`, line 72 sets `isServerEnv` for the Node environment. Line 86 enters `if (isServerEnv || options.platform === 'web')`. For this binary without image dimensions, line 107 returns:

```js
code: `module.exports = ${JSON.stringify(assetPath)};`
```

[logs/transformer-source.txt](logs/transformer-source.txt) records installed source lines 60-111 with original line numbers. `pnpm diagnose` regenerates the excerpt from the installed package.

### 4. Node can load both addons inside the same API server

`app/native-require+api.js` creates a Node `require` rooted at the repro's `package.json`:

```js
const nodeRequire = createRequire(`${process.cwd()}/package.json`);
const hello = nodeRequire('./native/build/Release/hello.node');
const bcrypt = nodeRequire('@node-rs/bcrypt-darwin-arm64');
```

This route returns HTTP 200 with `"message":"hello from native"`, a bcrypt hash, and `"verified":true`. This isolates the static asset transformation from native addon support in the server process. `process.cwd()` assumes this development server was started from the repo root. This is a diagnostic control, not a verified deployment configuration.

The standalone Node controls also pass:

```sh
$ pnpm control
{"module":"@node-rs/bcrypt-darwin-arm64","hash":"$2b$04$MxJT7lealAE29idH8X8oReztkvdpA9OfZdQGI336rXJ2SASwUfTr.","verified":true}
{"module":"hello.node","message":"hello from native"}
```

## Tested environment and limits

- macOS 27.2, Apple Silicon (`darwin arm64`)
- Node.js 24.13.0, pnpm 12.6.0
- Expo 58.0.17, Expo Router 58.0.25
- `@expo/cli` 58.1.18, `@expo/metro-config` 58.0.20, Metro 0.87.1
- `@node-rs/bcrypt-darwin-arm64` 2.0.0
- `node-gyp` 13.1.0

Tested with `expo start` and local HTTP requests. Production export, deployment, and other operating systems have not been tested. `pnpm-lock.yaml` records the full dependency versions. Generated native binaries are ignored by Git.
