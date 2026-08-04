import assert from "node:assert/strict";
import test from "node:test";
import { buildHinaSystemInstruction, readLanguageSettings } from "./language";

test("language settings normalize supported target and native languages", () => {
  assert.deepEqual(readLanguageSettings({ targetLanguage: "ja", nativeLanguage: "zh-CN" }), {
    targetLanguage: "ja",
    nativeLanguage: "zh-CN",
  });
  assert.deepEqual(readLanguageSettings({ targetLanguage: "xx", nativeLanguage: 12 }), {
    targetLanguage: "en",
    nativeLanguage: "zh-CN",
  });
});

test("Hina prompt separates target conversation from native explanations", () => {
  const prompt = buildHinaSystemInstruction({ targetLanguage: "fr", nativeLanguage: "en" });

  assert.match(prompt, /target language is French/);
  assert.match(prompt, /native language is English/);
  assert.match(prompt, /main conversational response must be written in French/);
  assert.match(prompt, /explained in English/);
});

test("Hina can use Portuguese as the learning language", () => {
  const prompt = buildHinaSystemInstruction({ targetLanguage: "pt", nativeLanguage: "zh-CN" });

  assert.match(prompt, /target language is Portuguese/);
  assert.match(prompt, /main conversational response must be written in Portuguese/);
  assert.match(prompt, /native language is Simplified Chinese/);
});
