import assert from "node:assert/strict";
import test from "node:test";
import { buildSpeakingEvaluationPrompt, normalizeSpeakingEvaluation, readSpeakingEvaluationInput, speakingScoreCeiling } from "./speaking";

test("speaking evaluation input accepts a known question and supported audio", () => {
  const input = readSpeakingEvaluationInput({
    questionId: "part1-daily-rhythm",
    audioBase64: "YWJjZA==",
    mimeType: "audio/webm;codecs=opus",
    nativeLanguage: "pt",
  });
  assert.equal(input.mimeType, "audio/webm");
  const prompt = buildSpeakingEvaluationPrompt(input);
  assert.match(prompt, /Part 1/);
  assert.match(prompt, /Portuguese/);
  assert.match(prompt, /burden-of-proof/);
  assert.match(prompt, /exact words copied from the transcript/);
});

test("speaking evaluation input rejects arbitrary prompts and oversized payloads", () => {
  assert.throws(() => readSpeakingEvaluationInput({ questionId: "made-up", audioBase64: "YWJj", mimeType: "audio/webm" }), /Unknown/);
  assert.throws(() => readSpeakingEvaluationInput({ questionId: "part1-daily-rhythm", audioBase64: "YWJj", mimeType: "video/mp4" }), /Unsupported/);
});

test("speaking evaluation normalization clamps scores to half bands", () => {
  const evaluation = normalizeSpeakingEvaluation({
    transcript: "I enjoy quiet mornings because I can read a book before work, make breakfast slowly, and plan everything I need to finish during the day without feeling rushed or distracted by other people.",
    summary: "Clear answer.",
    estimatedBand: 6.74,
    scores: { fluency: 9.8, lexicalResource: 6.2, grammar: 5.76, pronunciation: -1 },
    strengths: ['Evidence: "I enjoy quiet mornings" — The answer addresses the question directly.'],
    priorities: ["Add detail"],
    improvedAnswer: "I usually enjoy mornings the most.",
    studyNote: "Add a reason and example.",
    studyCards: [
      { kind: "grammar", title: "Past tense", body: "Keep completed events in the past tense." },
      { kind: "vocabulary", title: "Specific verbs", body: "Replace general verbs with vivid ones." },
      { kind: "expression", title: "Give a reason", body: "Use 'The main reason is...'" },
      { kind: "pronunciation", title: "Word endings", body: "Make final consonants audible." },
    ],
  });
  assert.equal(evaluation.estimatedBand, 5.5);
  assert.deepEqual(evaluation.scores, { fluency: 9, lexicalResource: 6, grammar: 6, pronunciation: 0 });
  assert.equal(evaluation.strengths.length, 1);
  assert.equal(evaluation.evidence.scoreCeiling, null);
  assert.equal(evaluation.studyCards.length, 4);
  assert.equal(evaluation.studyCards[0].kind, "grammar");
});

test("speaking evaluation applies deterministic evidence caps and recomputes the overall band", () => {
  const evaluation = normalizeSpeakingEvaluation({
    transcript: "I like night because it is good and I can relax.",
    summary: "Unsupported high-band praise.",
    estimatedBand: 8,
    scores: { fluency: 7, lexicalResource: 7, grammar: 7, pronunciation: 7 },
    strengths: [
      'Evidence: "sophisticated time management" — Excellent advanced vocabulary.',
      'Evidence: "I like night" — The answer starts directly.',
    ],
  }, { part: 1, nativeLanguage: "zh-CN" });

  assert.equal(speakingScoreCeiling(1, 11), 5);
  assert.deepEqual(evaluation.scores, { fluency: 5, lexicalResource: 5, grammar: 5, pronunciation: 5 });
  assert.equal(evaluation.estimatedBand, 5);
  assert.equal(evaluation.evidence.transcribedWordCount, 11);
  assert.equal(evaluation.evidence.confidence, "low");
  assert.match(evaluation.summary, /11 个英文词/);
  assert.deepEqual(evaluation.strengths, ['Evidence: "I like night" — The answer starts directly.']);
});

test("silent recordings cannot receive invented scores", () => {
  const evaluation = normalizeSpeakingEvaluation({
    transcript: "No clear speech was detected.",
    estimatedBand: 9,
    scores: { fluency: 9, lexicalResource: 9, grammar: 9, pronunciation: 9 },
    strengths: ['Evidence: "advanced vocabulary" — Excellent range.'],
  }, { part: 2 });

  assert.deepEqual(evaluation.scores, { fluency: 0, lexicalResource: 0, grammar: 0, pronunciation: 0 });
  assert.equal(evaluation.estimatedBand, 0);
  assert.equal(evaluation.strengths.length, 0);
});

test("speaking evaluation normalization fills any missing study-card category", () => {
  const evaluation = normalizeSpeakingEvaluation({
    studyNote: "Review this answer.",
    studyCards: [{ kind: "grammar", title: "Tense", body: "Keep the tense consistent." }],
  });

  assert.deepEqual(evaluation.studyCards.map((card) => card.kind), ["grammar", "vocabulary", "expression", "pronunciation"]);
});
