import assert from "node:assert/strict";
import test from "node:test";
import { findWritingTask2Prompt, WRITING_TASK_2_PROMPTS } from "./writingPrompts";

test("writing practice ships original Task 2 prompts across common topics", () => {
  assert.equal(WRITING_TASK_2_PROMPTS.length, 6);
  assert.equal(new Set(WRITING_TASK_2_PROMPTS.map((prompt) => prompt.topic)).size, 6);
  assert.match(findWritingTask2Prompt("task2-remote-work")?.question || "", /advantages/i);
  assert.equal(findWritingTask2Prompt("unknown"), null);
});
