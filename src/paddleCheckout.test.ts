import assert from "node:assert/strict";
import test from "node:test";
import { readPaddleClientConfig } from "./paddleCheckout";

test("readPaddleClientConfig exposes the Hina Pro price when token is configured", () => {
  const config = readPaddleClientConfig({
    VITE_PADDLE_CLIENT_TOKEN: "test_client_token",
  });

  assert.deepEqual(config, {
    clientToken: "test_client_token",
    environment: "production",
    priceId: "pri_01kwxsfc7hyn0b94ptrtf7y2ek",
  });
});

test("readPaddleClientConfig reports missing client token", () => {
  assert.throws(
    () => readPaddleClientConfig({}),
    /VITE_PADDLE_CLIENT_TOKEN/,
  );
});
