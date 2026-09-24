import assert from "node:assert/strict";
import test from "node:test";
import { buildSpeakingEvaluationPrompt, normalizeSpeakingEvaluation, readSpeakingEvaluationInput } from "./speaking";

test("speaking evaluation input accepts a known question and supported audio", () => {
  const input = readSpeakingEvaluationInput({
    questionId: "part1-daily-rhythm",
    audioBase64: "YWJjZA==",
    mimeType: "audio/webm;codecs=opus",
    nativeLanguage: "pt",
  });
  assert.equal(input.mimeType, "audio/webm");
  assert.match(buildSpeakingEvaluationPrompt(input), /Part 1/);
  assert.match(buildSpeakingEvaluationPrompt(input), /Portuguese/);
});

test("speaking evaluation input rejects arbitrary prompts and oversized payloads", () => {
  assert.throws(() => readSpeakingEvaluationInput({ questionId: "made-up", audioBase64: "YWJj", mimeType: "audio/webm" }), /Unknown/);
  assert.throws(() => readSpeakingEvaluationInput({ questionId: "part1-daily-rhythm", audioBase64: "YWJj", mimeType: "video/mp4" }), /Unsupported/);
});

test("speaking evaluation normalization clamps scores to half bands", () => {
  const evaluation = normalizeSpeakingEvaluation({
    transcript: "I enjoy mornings.",
    summary: "Clear answer.",
    estimatedBand: 6.74,
    scores: { fluency: 9.8, lexicalResource: 6.2, grammar: 5.76, pronunciation: -1 },
    strengths: ["Clear idea"],
    priorities: ["Add detail"],
    improvedAnswer: "I usually enjoy mornings the most.",
    studyNote: "Add a reason and example.",
  });
  assert.equal(evaluation.estimatedBand, 6.5);
  assert.deepEqual(evaluation.scores, { fluency: 9, lexicalResource: 6, grammar: 6, pronunciation: 0 });
});
