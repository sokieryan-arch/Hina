import assert from "node:assert/strict";
import test from "node:test";
import { ambientPresence, resolvePresence } from "./presence";

test("resolvePresence prioritizes live activity over ambient state", () => {
  assert.equal(resolvePresence({ ambient: "reading" }), "reading");
  assert.equal(resolvePresence({ ambient: "reading", preparing: true }), "preparing");
  assert.equal(resolvePresence({ ambient: "reading", preparing: true, thinking: true }), "thinking");
  assert.equal(resolvePresence({ ambient: "reading", thinking: true, speaking: true }), "speaking");
});

test("ambientPresence is stable within the same New York half-hour slot", () => {
  const first = ambientPresence(new Date("2026-07-22T13:01:00.000Z"));
  const second = ambientPresence(new Date("2026-07-22T13:29:00.000Z"));

  assert.equal(first, second);
});
