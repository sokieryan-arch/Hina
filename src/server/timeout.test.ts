import assert from "node:assert/strict";
import test from "node:test";
import { isOperationTimeoutError, OperationTimeoutError, withTimeout } from "./timeout";

test("withTimeout returns a settled operation before the deadline", async () => {
  const result = await withTimeout(Promise.resolve("ok"), 100, "quick work");
  assert.equal(result, "ok");
});

test("withTimeout rejects slow operations with a named timeout error", async () => {
  await assert.rejects(
    withTimeout(new Promise((resolve) => setTimeout(resolve, 50)), 5, "slow work"),
    (error) => error instanceof OperationTimeoutError
      && error.message === "slow work timed out after 5ms",
  );
});

test("isOperationTimeoutError recognizes timeout errors across bundle boundaries", () => {
  assert.equal(isOperationTimeoutError(new OperationTimeoutError("work", 5)), true);
  assert.equal(isOperationTimeoutError({ name: "OperationTimeoutError", message: "work timed out after 5ms" }), true);
  assert.equal(isOperationTimeoutError(new Error("work timed out after 5ms")), false);
});
