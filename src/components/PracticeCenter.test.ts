import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticeCenter } from "./PracticeCenter";

test("practice center offers speaking and both writing tasks", () => {
  const markup = renderToStaticMarkup(React.createElement(PracticeCenter, {
    ownerId: "preview",
    nativeLanguage: "zh-CN",
    onEvaluateSpeaking: async () => { throw new Error("not used"); },
    onSaveSpeakingStudyCards: () => {},
    onEvaluateWriting: async () => { throw new Error("not used"); },
    onSaveWritingStudyCards: () => {},
  }));
  assert.match(markup, /Speaking/);
  assert.match(markup, />Writing</);
  assert.match(markup, /Task 1 visuals/);
  assert.match(markup, /Task 2 argument/);
});
