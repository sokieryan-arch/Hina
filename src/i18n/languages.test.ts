import assert from "node:assert/strict";
import test from "node:test";
import { languageSummary, normalizeLanguageSettings } from "./languages";

test("language settings keep target and native values separate", () => {
  const settings = normalizeLanguageSettings({ targetLanguage: "ja", nativeLanguage: "zh-CN" });

  assert.deepEqual(settings, { targetLanguage: "ja", nativeLanguage: "zh-CN" });
  assert.equal(languageSummary(settings), "日本語 / 简体中文");
});

test("invalid language values fall back to international defaults", () => {
  assert.deepEqual(normalizeLanguageSettings({ targetLanguage: "xx" as any, nativeLanguage: "??" as any }), {
    targetLanguage: "en",
    nativeLanguage: "zh-CN",
  });
});

test("Portuguese is available for both target and native language", () => {
  const settings = normalizeLanguageSettings({ targetLanguage: "pt", nativeLanguage: "pt" });

  assert.deepEqual(settings, { targetLanguage: "pt", nativeLanguage: "pt" });
  assert.equal(languageSummary(settings), "Português / Português");
});
