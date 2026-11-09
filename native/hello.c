#include <assert.h>
#include <node_api.h>

static napi_value hello(napi_env env, napi_callback_info info) {
  napi_value result;
  assert(napi_create_string_utf8(env, "hello from native", NAPI_AUTO_LENGTH, &result) == napi_ok);
  return result;
}

static napi_value init(napi_env env, napi_value exports) {
  napi_value function;
  assert(napi_create_function(env, "hello", NAPI_AUTO_LENGTH, hello, NULL, &function) == napi_ok);
  assert(napi_set_named_property(env, exports, "hello", function) == napi_ok);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
