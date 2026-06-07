export type AuthMode = "required" | "optional" | "disabled";
export type ChatRole = "user" | "model";

export interface ChatMessageInput {
  role: ChatRole;
  text: string;
}

interface SanitizeOptions {
  maxMessages?: number;
  maxTextLength?: number;
}

export function parseAuthMode(value: string | undefined, nodeEnv = "development"): AuthMode {
  if (value === "required" || value === "optional" || value === "disabled") {
    return value;
  }

  return nodeEnv === "production" ? "required" : "optional";
}

export function sanitizeChatMessages(input: unknown, options: SanitizeOptions = {}): ChatMessageInput[] {
  if (!Array.isArray(input)) {
    throw new Error("Messages must be an array.");
  }

  const maxMessages = options.maxMessages ?? 10;
  const maxTextLength = options.maxTextLength ?? 4_000;
  const messages = input
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const source = message as Record<string, unknown>;
      if (source.role !== "user" && source.role !== "model") return null;
      if (typeof source.text !== "string") return null;

      const text = source.text.trim().slice(0, maxTextLength);
      if (!text) return null;

      return {
        role: source.role,
        text,
      };
    })
    .filter((message): message is ChatMessageInput => message !== null);

  if (!messages.some((message) => message.role === "user")) {
    throw new Error("Messages must include at least one user message.");
  }

  return messages.slice(-maxMessages);
}

interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, RateLimitBucket>();
  const now = options.now ?? (() => Date.now());

  return {
    consume(key: string): RateLimitResult {
      const safeKey = key || "anonymous";
      const currentTime = now();
      const existing = buckets.get(safeKey);
      const bucket = !existing || existing.resetAt <= currentTime
        ? { count: 0, resetAt: currentTime + options.windowMs }
        : existing;

      if (bucket.count >= options.limit) {
        buckets.set(safeKey, bucket);
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, bucket.resetAt - currentTime),
        };
      }

      bucket.count += 1;
      buckets.set(safeKey, bucket);

      return {
        allowed: true,
        remaining: Math.max(0, options.limit - bucket.count),
        retryAfterMs: Math.max(0, bucket.resetAt - currentTime),
      };
    },
  };
}
