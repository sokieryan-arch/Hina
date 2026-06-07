import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLanguageTips } from "./languageTips";

test("normalizeLanguageTips always returns two concise learning tips", () => {
  const tips = normalizeLanguageTips([
    {
      type: "correction",
      title: "Tiny grammar tweak",
      body: "Say \"I went\" instead of \"I go\" when talking about yesterday.",
      example: "Yesterday I went to class.",
    },
  ]);

  assert.equal(tips.length, 2);
  assert.equal(tips[0].type, "correction");
  assert.equal(tips[1].type, "expression");
  assert.ok(tips.every((tip) => tip.title.length > 0));
  assert.ok(tips.every((tip) => tip.body.length > 0));
});

test("normalizeLanguageTips removes invalid tips and truncates noisy model output", () => {
  const tips = normalizeLanguageTips([
    { type: "random", title: "", body: "" },
    {
      type: "expression",
      title: "x".repeat(200),
      body: "y".repeat(1000),
      example: "z".repeat(500),
    },
    {
      type: "culture",
      title: "Metro wording",
      body: "New Yorkers usually say \"subway\", not \"metro\".",
    },
  ]);

  assert.equal(tips.length, 2);
  assert.equal(tips[0].type, "expression");
  assert.equal(tips[0].title.length, 80);
  assert.equal(tips[0].body.length, 360);
  assert.equal(tips[0].example?.length, 180);
  assert.equal(tips[1].type, "culture");
});
