import test from "node:test";
import assert from "node:assert/strict";
import { extractBearerToken, getRequestIp } from "./auth";

test("extractBearerToken accepts only bearer authorization headers", () => {
  assert.equal(extractBearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(extractBearerToken("bearer token"), "token");
  assert.equal(extractBearerToken("Basic token"), null);
  assert.equal(extractBearerToken(undefined), null);
});

test("getRequestIp prefers forwarded client IP and falls back safely", () => {
  assert.equal(getRequestIp({
    headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    ip: "127.0.0.1",
  }), "203.0.113.9");

  assert.equal(getRequestIp({
    headers: {},
    ip: "::1",
  }), "::1");

  assert.equal(getRequestIp({
    headers: {},
  }), "unknown");
});
