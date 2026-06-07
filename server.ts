import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { resolveRequestIdentity } from "./src/server/auth";
import { buildProactivePromptInput, parseLastInteractionAt } from "./src/server/proactiveApi";
import { createLanguagePartnerProvider } from "./src/server/providers/geminiProvider";
import { createRateLimiter, parseAuthMode, sanitizeChatMessages } from "./src/server/requestGuards";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const authMode = parseAuthMode(process.env.AI_AUTH_MODE, process.env.NODE_ENV);
const provider = createLanguagePartnerProvider();

const chatLimiter = createRateLimiter({
  limit: Number.parseInt(process.env.CHAT_RATE_LIMIT_PER_MINUTE || "30", 10),
  windowMs: 60_000,
});
const ttsLimiter = createRateLimiter({
  limit: Number.parseInt(process.env.TTS_RATE_LIMIT_PER_MINUTE || "10", 10),
  windowMs: 60_000,
});
const proactiveLimiter = createRateLimiter({
  limit: Number.parseInt(process.env.PROACTIVE_RATE_LIMIT_PER_HOUR || "12", 10),
  windowMs: 60 * 60_000,
});

function getStatusCode(error: unknown, fallback = 500): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number") return statusCode;
  }

  return fallback;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.post("/api/chat", async (req, res) => {
    try {
      const identity = await resolveRequestIdentity(req, authMode);
      const rateLimit = chatLimiter.consume(identity.rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: "Too many chat requests. Please slow down a little.",
          retryAfterMs: rateLimit.retryAfterMs,
        });
      }

      const messages = sanitizeChatMessages(req.body?.messages);
      const data = await provider.chat(messages);
      res.json(data);
    } catch (error) {
      console.error("Chat Error:", error);
      res.status(getStatusCode(error)).json({ error: "Failed to generate response" });
    }
  });

  app.post("/api/proactive/draft", async (req, res) => {
    try {
      const identity = await resolveRequestIdentity(req, authMode);
      const rateLimit = proactiveLimiter.consume(identity.rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: "Too many proactive drafts. Please try again later.",
          retryAfterMs: rateLimit.retryAfterMs,
        });
      }

      const promptInput = buildProactivePromptInput({
        localDate: req.body?.localDate,
        favoriteTopics: req.body?.favoriteTopics,
        recentMessages: req.body?.recentMessages,
      });
      const lastInteractionAt = parseLastInteractionAt(req.body?.lastInteractionAt);
      const now = new Date();
      const settings = req.body?.settings;

      const { normalizeProactiveSettings, shouldCreateProactiveNudge } = await import("./src/server/proactive");
      const normalizedSettings = normalizeProactiveSettings(settings);
      const due = shouldCreateProactiveNudge(normalizedSettings, { now, lastInteractionAt });
      if (!due) {
        return res.json({ due: false });
      }

      const data = await provider.draftProactiveOpener(promptInput);
      res.json({
        due: true,
        ...data,
      });
    } catch (error) {
      console.error("Proactive Draft Error:", error);
      res.status(getStatusCode(error)).json({ error: "Failed to draft proactive opener" });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const identity = await resolveRequestIdentity(req, authMode);
      const rateLimit = ttsLimiter.consume(identity.rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: "Voice generation is temporarily rate-limited. Please try again later.",
          retryAfterMs: rateLimit.retryAfterMs,
        });
      }

      const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 700) : "";
      if (!text) {
        return res.status(400).json({ error: "Missing text" });
      }

      const speech = await provider.speak(text);
      res.json(speech);
    } catch (error) {
      console.error("TTS Error:", error);
      res.status(getStatusCode(error)).json({ error: "Failed to generate TTS" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`AI auth mode: ${authMode}`);
  });
}

startServer();
