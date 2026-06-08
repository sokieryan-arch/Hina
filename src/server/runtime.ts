import { createApiHandlers } from "./apiHandlers.js";
import { createLazyLanguagePartnerProvider } from "./providers/geminiProvider.js";
import { createRateLimiter, parseAuthMode } from "./requestGuards.js";

export const authMode = parseAuthMode(process.env.AI_AUTH_MODE, process.env.NODE_ENV);

export const apiHandlers = createApiHandlers({
  authMode,
  provider: createLazyLanguagePartnerProvider(),
  chatLimiter: createRateLimiter({
    limit: Number.parseInt(process.env.CHAT_RATE_LIMIT_PER_MINUTE || "30", 10),
    windowMs: 60_000,
  }),
  ttsLimiter: createRateLimiter({
    limit: Number.parseInt(process.env.TTS_RATE_LIMIT_PER_MINUTE || "10", 10),
    windowMs: 60_000,
  }),
  proactiveLimiter: createRateLimiter({
    limit: Number.parseInt(process.env.PROACTIVE_RATE_LIMIT_PER_HOUR || "12", 10),
    windowMs: 60 * 60_000,
  }),
});
