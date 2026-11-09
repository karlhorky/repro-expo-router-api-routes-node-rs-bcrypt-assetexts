# Native bcrypt imports in Expo Router API Routes with `assetExts`

Reproduction for https://github.com/react/metro/issues/1377#issuecomment-2440121091

Adding `node` to Metro's `resolver.assetExts` allows the direct native addon import to bundle, but imports an asset URL instead of loading the Node-API addon. `bcrypt` fails differently: its bundled native loader searches the API route directory for the binary.

## Steps to reproduce

Requires macOS on Apple Silicon. The direct `@node-rs/bcrypt-darwin-arm64` dependency intentionally matches the package in the original issue.

```sh
git clone https://github.com/karlhorky/repro-expo-router-api-routes-node-rs-bcrypt-assetexts.git
cd repro-expo-router-api-routes-node-rs-bcrypt-assetexts
pnpm install --frozen-lockfile
pnpm control
pnpm start
```

In another terminal:

```sh
pnpm check
```

`pnpm-workspace.yaml` allows `bcrypt`'s install script. No database, credentials, device, or mobile build is needed.

The configuration under test is:

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('node');

module.exports = config;
```

## Expected and observed results

Expected: both hashing routes return HTTP 200 with a bcrypt hash. Observed:

| Request | HTTP status | Failure location |
| --- | --- | --- |
| `/node-rs` | 500 | Handler calls the missing `hashSync` export |
| `/node-rs-asset` | 200 | Diagnostic route returns the imported asset URL |
| `/bcrypt` | 500 | Module initialization in `node-gyp-build`, before the handler runs |

The assertions in `scripts/check.mjs` check these observed failures. A passing check reproduces the problem, rather than indicating native addon support works.

### Direct `@node-rs/bcrypt-darwin-arm64@2.0.0` import

`app/node-rs+api.js` bundles, then fails at line 4 when `GET()` calls `hashSync`:

```text
λ Bundled 119ms app/node-rs+api.js (2 modules)

Metro error: (0 , _nodeRsBcryptDarwinArm.hashSync) is not a function

Call Stack
  GET (app/node-rs+api.js:4:24)
```

`app/node-rs-asset+api.js` inspects the imported default value:

```sh
$ curl --silent http://localhost:8107/node-rs-asset
{"type":"string","value":"/assets/?unstable_path=.%2Fnode_modules%2F.pnpm%2F%40node-rs%2Bbcrypt-darwin-arm64%402.0.0%2Fnode_modules%2F%40node-rs%2Fbcrypt-darwin-arm64/bcrypt.darwin-arm64.node"}
```

The import resolves to a string URL, so it has no `hashSync` export. Metro does not attempt to parse the binary as JavaScript, but it also does not load it as a Node-API addon.

The direct binary's v2 `hashSync` call includes the native binding arguments used by the Node control. The same arguments succeed outside Metro.

### `bcrypt@6.0.0` comparison

`app/bcrypt+api.js` also bundles, but importing `bcrypt` fails before `GET()` executes:

```text
λ Bundled 71ms app/bcrypt+api.js (1 module)

Metro error: No native build was found for platform=darwin arch=arm64 runtime=node abi=137 uv=1 armv=8 libc=glibc node=24.13.0
    loaded from: <repro>/app

Call Stack
  load.resolve [as path] (node_modules/.pnpm/node-gyp-build@4.8.4/node_modules/node-gyp-build/node-gyp-build.js:60:9)
  load (node_modules/.pnpm/node-gyp-build@4.8.4/node_modules/node-gyp-build/node-gyp-build.js:22:30)
  <unknown> (node_modules/.pnpm/bcrypt@6.0.0/node_modules/bcrypt/bcrypt.js:2:43)
  <unknown> (app/bcrypt+api.js:1)
```

`bcrypt/bcrypt.js:2` calls:

```js
const bindings = require('node-gyp-build')(path.resolve(__dirname));
```

The observed search directory is `<repro>/app`, rather than the installed `bcrypt` package directory containing `prebuilds/darwin-arm64/bcrypt.node`. The loader throws at `node-gyp-build/node-gyp-build.js:60`. This is a different failure from the asset URL returned by the direct native import.

### Node controls

The same installed native addons hash and verify successfully when loaded with Node's `require()`:

```sh
$ pnpm control
{"module":"@node-rs/bcrypt-darwin-arm64","hash":"$2b$04$gWzENuiXY.1JNUp/RozmGe3q4AeEgtf4/wU2TYHSxMxWZZB0I6XSi","verified":true}
{"module":"bcrypt","hash":"$2b$04$8CjTX1yWD1dQElfLqVpPhuYz8eAayh2TxscbRJjdmDOiSfIPxO5bq","verified":true}
```

The HTTP check output is saved in [logs/check.txt](logs/check.txt). [logs/metro.txt](logs/metro.txt) contains the captured Metro output, with ANSI colors removed and the absolute repro directory replaced by `<repro>`.

## Tested environment

- macOS 27.2, Apple Silicon (`darwin arm64`)
- Node.js 24.13.0
- pnpm 12.6.0 (pinned in `package.json`)
- Expo 58.0.17
- Expo Router 58.0.25
- `@expo/cli` 58.1.18
- `@expo/metro-config` 58.0.20
- Metro 0.87.1
- `@node-rs/bcrypt-darwin-arm64` 2.0.0
- `bcrypt` 6.0.0
- `node-gyp-build` 4.8.4

Tested with `expo start` and local HTTP requests. Production export and other operating systems have not been tested. The lockfile records the full dependency versions.
