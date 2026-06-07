import test from "node:test";
import assert from "node:assert/strict";
import { buildProactivePromptInput, parseLastInteractionAt } from "./proactiveApi";

test("buildProactivePromptInput trims and bounds client proactive context", () => {
  const input = buildProactivePromptInput({
    localDate: " 2026-06-08 ",
    favoriteTopics: [" films ", "food", "x".repeat(100), 42],
    recentMessages: [" hello ".repeat(100), "", "IELTS speaking"],
  });

  assert.equal(input.localDate, "2026-06-08");
  assert.deepEqual(input.favoriteTopics, ["films", "food", "x".repeat(40)]);
  assert.equal(input.recentMessages.length, 2);
  assert.equal(input.recentMessages[0].length, 240);
});

test("parseLastInteractionAt returns dates for valid input and null otherwise", () => {
  assert.equal(parseLastInteractionAt(undefined), null);
  assert.equal(parseLastInteractionAt("not a date"), null);
  assert.equal(parseLastInteractionAt("2026-06-08T12:00:00.000Z")?.toISOString(), "2026-06-08T12:00:00.000Z");
});
