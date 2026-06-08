import { resolveRequestIdentity, type RequestLike } from "./auth";
import { buildProactivePromptInput, parseLastInteractionAt } from "./proactiveApi";
import { normalizeProactiveSettings, shouldCreateProactiveNudge } from "./proactive";
import { sanitizeChatMessages, type AuthMode } from "./requestGuards";
import type { LanguagePartnerProvider } from "./providers/types";

interface RateLimiter {
  consume(key: string): {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
  };
}

export interface ApiRequest extends RequestLike {
  body?: any;
}

export interface ApiResult {
  status: number;
  body: any;
}

export interface ApiHandlerDependencies {
  authMode: AuthMode;
  provider: LanguagePartnerProvider;
  chatLimiter: RateLimiter;
  ttsLimiter: RateLimiter;
  proactiveLimiter: RateLimiter;
}

function getStatusCode(error: unknown, fallback = 500): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number") return statusCode;
  }

  return fallback;
}

export function createApiHandlers(deps: ApiHandlerDependencies) {
  return {
    async chat(request: ApiRequest): Promise<ApiResult> {
      try {
        const identity = await resolveRequestIdentity(request, deps.authMode);
        const rateLimit = deps.chatLimiter.consume(identity.rateLimitKey);
        if (!rateLimit.allowed) {
          return {
            status: 429,
            body: {
              error: "Too many chat requests. Please slow down a little.",
              retryAfterMs: rateLimit.retryAfterMs,
            },
          };
        }

        const messages = sanitizeChatMessages(request.body?.messages);
        const data = await deps.provider.chat(messages);
        return { status: 200, body: data };
      } catch (error) {
        console.error("Chat Error:", error);
        return { status: getStatusCode(error), body: { error: "Failed to generate response" } };
      }
    },

    async proactiveDraft(request: ApiRequest): Promise<ApiResult> {
      try {
        const identity = await resolveRequestIdentity(request, deps.authMode);
        const rateLimit = deps.proactiveLimiter.consume(identity.rateLimitKey);
        if (!rateLimit.allowed) {
          return {
            status: 429,
            body: {
              error: "Too many proactive drafts. Please try again later.",
              retryAfterMs: rateLimit.retryAfterMs,
            },
          };
        }

        const promptInput = buildProactivePromptInput({
          localDate: request.body?.localDate,
          favoriteTopics: request.body?.favoriteTopics,
          recentMessages: request.body?.recentMessages,
        });
        const lastInteractionAt = parseLastInteractionAt(request.body?.lastInteractionAt);
        const normalizedSettings = normalizeProactiveSettings(request.body?.settings);
        const due = shouldCreateProactiveNudge(normalizedSettings, { now: new Date(), lastInteractionAt });

        if (!due) {
          return { status: 200, body: { due: false } };
        }

        const data = await deps.provider.draftProactiveOpener(promptInput);
        return {
          status: 200,
          body: {
            due: true,
            ...data,
          },
        };
      } catch (error) {
        console.error("Proactive Draft Error:", error);
        return { status: getStatusCode(error), body: { error: "Failed to draft proactive opener" } };
      }
    },

    async tts(request: ApiRequest): Promise<ApiResult> {
      try {
        const identity = await resolveRequestIdentity(request, deps.authMode);
        const rateLimit = deps.ttsLimiter.consume(identity.rateLimitKey);
        if (!rateLimit.allowed) {
          return {
            status: 429,
            body: {
              error: "Voice generation is temporarily rate-limited. Please try again later.",
              retryAfterMs: rateLimit.retryAfterMs,
            },
          };
        }

        const text = typeof request.body?.text === "string" ? request.body.text.trim().slice(0, 700) : "";
        if (!text) {
          return { status: 400, body: { error: "Missing text" } };
        }

        const speech = await deps.provider.speak(text);
        return { status: 200, body: speech };
      } catch (error) {
        console.error("TTS Error:", error);
        return { status: getStatusCode(error), body: { error: "Failed to generate TTS" } };
      }
    },
  };
}
