import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter, sanitizeChatMessages, parseAuthMode } from "./requestGuards";

test("sanitizeChatMessages keeps only valid recent chat messages", () => {
  const longText = "x".repeat(5000);
  const input = [
    { role: "system", text: "ignore me" },
    { role: "user", text: "  hi  " },
    { role: "model", text: "hello" },
    { role: "user", text: longText },
    { role: "user", text: "" },
    { role: "model", text: "a" },
    { role: "model", text: "b" },
    { role: "model", text: "c" },
    { role: "model", text: "d" },
    { role: "model", text: "e" },
    { role: "model", text: "f" },
    { role: "model", text: "g" },
  ];

  const messages = sanitizeChatMessages(input, { maxMessages: 5, maxTextLength: 20 });

  assert.equal(messages.length, 5);
  assert.deepEqual(messages[0], { role: "model", text: "c" });
  assert.equal(messages[4].text, "g");
  assert.ok(messages.every((message) => message.role === "user" || message.role === "model"));
  assert.ok(messages.every((message) => message.text.length <= 20));
});

test("sanitizeChatMessages rejects requests without a user message", () => {
  assert.throws(
    () => sanitizeChatMessages([{ role: "model", text: "hello" }]),
    /at least one user message/i,
  );
});

test("createRateLimiter blocks after the configured limit and resets by window", () => {
  let now = 1_000;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => now });

  assert.equal(limiter.consume("u1").allowed, true);
  assert.equal(limiter.consume("u1").allowed, true);
  const blocked = limiter.consume("u1");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 1_000);

  now = 2_001;
  assert.equal(limiter.consume("u1").allowed, true);
});

test("parseAuthMode defaults to required in production and optional otherwise", () => {
  assert.equal(parseAuthMode(undefined, "production"), "required");
  assert.equal(parseAuthMode(undefined, "development"), "optional");
  assert.equal(parseAuthMode("disabled", "production"), "disabled");
  assert.equal(parseAuthMode("anything", "production"), "required");
});
