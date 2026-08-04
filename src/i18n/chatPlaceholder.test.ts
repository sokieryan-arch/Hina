import assert from "node:assert/strict";
import test from "node:test";
import { getChatPlaceholderCandidates, pickChatPlaceholder } from "./chatPlaceholder";

test("pickChatPlaceholder selects deterministic candidates for tests", () => {
  assert.equal(pickChatPlaceholder({ random: () => 0 }), "Tell Hina what happened today...");
  assert.equal(pickChatPlaceholder({ random: () => 0.999 }), "Ask Hina for a tiny correction...");
});

test("getChatPlaceholderCandidates supports presence-specific prompts", () => {
  const reading = getChatPlaceholderCandidates({ presence: "reading" });

  assert.ok(reading.some((candidate) => candidate.includes("book")));
  assert.notDeepEqual(reading, getChatPlaceholderCandidates());
});

test("getChatPlaceholderCandidates supports Portuguese practice", () => {
  const candidates = getChatPlaceholderCandidates({ targetLanguage: "pt" });

  assert.match(candidates[0], /Conte à Hina/);
  assert.match(candidates[2], /praticar hoje/);
});
