import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WritingPractice } from "./WritingPractice";

test("writing practice renders original Task 2 prompts and history disclaimer", () => {
  const markup = renderToStaticMarkup(React.createElement(WritingPractice, {
    ownerId: "preview",
    nativeLanguage: "zh-CN",
    onExit: () => {},
    onEvaluate: async () => { throw new Error("not used"); },
    onSaveStudyCards: () => {},
  }));
  assert.match(markup, /IELTS Writing Task 2/);
  assert.match(markup, /Working from home/);
  assert.match(markup, /original/);
  assert.match(markup, /not an official IELTS score/);
});
