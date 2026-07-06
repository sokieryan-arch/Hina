import assert from "node:assert/strict";
import test from "node:test";
import { readGeminiApiKey } from "./geminiConfig";

test("readGeminiApiKey rejects missing, blank, and empty quoted keys", () => {
  assert.equal(readGeminiApiKey({}), null);
  assert.equal(readGeminiApiKey({ GEMINI_API_KEY: "" }), null);
  assert.equal(readGeminiApiKey({ GEMINI_API_KEY: "   " }), null);
  assert.equal(readGeminiApiKey({ GEMINI_API_KEY: '""' }), null);
  assert.equal(readGeminiApiKey({ GEMINI_API_KEY: "''" }), null);
});

test("readGeminiApiKey trims surrounding quotes from real keys", () => {
  assert.equal(readGeminiApiKey({ GEMINI_API_KEY: "AIza-real-key" }), "AIza-real-key");
  assert.equal(readGeminiApiKey({ GEMINI_API_KEY: "\"AIza-real-key\"" }), "AIza-real-key");
});
