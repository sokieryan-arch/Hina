import assert from "node:assert/strict";
import test from "node:test";
import { buildOpenAIChatMessages, readAIConfig } from "./aiConfig";

test("readAIConfig chooses OpenAI when OPENAI_API_KEY is configured", () => {
  const config = readAIConfig({ OPENAI_API_KEY: "\"sk-test\"" });

  assert.equal(config.provider, "openai");
  assert.equal(config.apiKey, "sk-test");
  assert.equal(config.chatModel, "gpt-4o-mini");
  assert.equal(config.ttsModel, "tts-1");
  assert.equal(config.ttsVoice, "nova");
  assert.equal(config.timeoutMs, 20000);
});

test("readAIConfig can still choose Gemini as a fallback provider", () => {
  const config = readAIConfig({ GEMINI_API_KEY: "AIza-test" });

  assert.equal(config.provider, "gemini");
  assert.equal(config.apiKey, "AIza-test");
  assert.equal(config.timeoutMs, 20000);
});

test("readAIConfig reports a precise missing key for a forced provider", () => {
  const config = readAIConfig({ AI_PROVIDER: "openai", GEMINI_API_KEY: "AIza-test" });

  assert.equal(config.provider, null);
  assert.equal(config.error, "OPENAI_API_KEY is not configured on the server.");
});

test("readAIConfig rejects unsupported providers", () => {
  const config = readAIConfig({ AI_PROVIDER: "other", OPENAI_API_KEY: "sk-test" });

  assert.equal(config.provider, null);
  assert.equal(config.error, 'AI_PROVIDER must be "openai" or "gemini".');
});

test("buildOpenAIChatMessages maps Hina history roles to OpenAI roles", () => {
  const messages = buildOpenAIChatMessages("system prompt", [
    { role: "user", text: "hello" },
    { role: "model", text: "hi" },
    { role: "assistant", text: "again" },
  ]);

  assert.deepEqual(messages, [
    { role: "system", content: "system prompt" },
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "assistant", content: "again" },
  ]);
});
