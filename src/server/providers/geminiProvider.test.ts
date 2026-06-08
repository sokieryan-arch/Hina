import test from "node:test";
import assert from "node:assert/strict";
import { createLazyLanguagePartnerProvider } from "./geminiProvider";

test("lazy provider can be created before GEMINI_API_KEY is configured", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const provider = createLazyLanguagePartnerProvider();
    await assert.rejects(
      () => provider.chat([{ role: "user", text: "hello" }]),
      /Missing GEMINI_API_KEY/,
    );
  } finally {
    if (previousKey) {
      process.env.GEMINI_API_KEY = previousKey;
    }
  }
});
