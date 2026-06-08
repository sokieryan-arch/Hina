import test from "node:test";
import assert from "node:assert/strict";
import { createApiHandlers } from "./apiHandlers";
import { createRateLimiter } from "./requestGuards";
import type { LanguagePartnerProvider } from "./providers/types";

const fakeProvider: LanguagePartnerProvider = {
  async chat(messages) {
    return {
      response: `heard: ${messages.at(-1)?.text}`,
      tips: [
        { type: "correction", title: "Tiny polish", body: "Your sentence is clear." },
        { type: "expression", title: "Useful phrase", body: "Try saying \"low-key\" for something subtle." },
      ],
    };
  },
  async draftProactiveOpener() {
    return {
      response: "Tiny subway thought: what is your day giving?",
      tips: [
        { type: "correction", title: "Tiny polish", body: "Nice and natural." },
        { type: "expression", title: "Side quest", body: "A side quest is a small unexpected adventure." },
      ],
    };
  },
  async speak(text) {
    return { audio: Buffer.from(text).toString("base64"), mimeType: "audio/wav" };
  },
};

function createTestHandlers() {
  return createApiHandlers({
    authMode: "disabled",
    provider: fakeProvider,
    chatLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
    ttsLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
    proactiveLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
  });
}

test("chat handler returns structured Hina response for serverless callers", async () => {
  const handlers = createTestHandlers();
  const result = await handlers.chat({
    body: { messages: [{ role: "user", text: "hello" }] },
    headers: {},
    ip: "127.0.0.1",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.response, "heard: hello");
  assert.equal(result.body.tips.length, 2);
});

test("tts handler rejects empty text before calling provider", async () => {
  const handlers = createTestHandlers();
  const result = await handlers.tts({
    body: { text: "   " },
    headers: {},
    ip: "127.0.0.1",
  });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { error: "Missing text" });
});

test("chat handler returns an actionable code when Gemini key is missing", async () => {
  const handlers = createApiHandlers({
    authMode: "disabled",
    provider: {
      ...fakeProvider,
      async chat() {
        throw new Error("Missing GEMINI_API_KEY.");
      },
    },
    chatLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
    ttsLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
    proactiveLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }),
  });

  const result = await handlers.chat({
    body: { messages: [{ role: "user", text: "hello" }] },
    headers: {},
    ip: "127.0.0.1",
  });

  assert.equal(result.status, 500);
  assert.deepEqual(result.body, {
    error: "missing_gemini_api_key",
    message: "GEMINI_API_KEY is not configured on the server.",
  });
});
