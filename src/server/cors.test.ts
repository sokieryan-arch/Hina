import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllowedNativeAppOrigin,
  NATIVE_APP_CORS_HEADERS,
  NATIVE_APP_CORS_METHODS,
} from "./cors";

test("allows the local origins used by Capacitor apps", () => {
  assert.equal(getAllowedNativeAppOrigin("https://localhost"), "https://localhost");
  assert.equal(getAllowedNativeAppOrigin("http://localhost"), "http://localhost");
  assert.equal(getAllowedNativeAppOrigin("capacitor://localhost"), "capacitor://localhost");
});

test("does not reflect arbitrary web origins", () => {
  assert.equal(getAllowedNativeAppOrigin(undefined), null);
  assert.equal(getAllowedNativeAppOrigin("https://localhost.example.com"), null);
  assert.equal(getAllowedNativeAppOrigin("https://evil.example"), null);
});

test("allows the methods and headers used by the native API client", () => {
  assert.equal(NATIVE_APP_CORS_METHODS, "GET,POST,PUT,DELETE,OPTIONS");
  assert.equal(NATIVE_APP_CORS_HEADERS, "Authorization,Content-Type");
});
