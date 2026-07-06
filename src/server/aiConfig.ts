export type AIProviderName = "openai" | "gemini";

export type HinaHistoryMessage = {
  role: string;
  text: string;
};

type AIConfigShared = {
  chatModel: string;
  ttsModel: string;
  ttsVoice: string;
  timeoutMs: number;
};

export type AIConfig =
  | (AIConfigShared & { provider: "openai"; apiKey: string; error: null })
  | (AIConfigShared & { provider: "gemini"; apiKey: string; error: null })
  | (AIConfigShared & { provider: null; apiKey: null; error: string });

function readSecret(raw: string | undefined) {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const withoutWrappingQuotes = trimmed.replace(/^(['"])(.*)\1$/, "$2").trim();
  return withoutWrappingQuotes || null;
}

function readTimeoutMs(env: Record<string, string | undefined>) {
  const raw = env.OPENAI_REQUEST_TIMEOUT_MS || env.GEMINI_REQUEST_TIMEOUT_MS || "20000";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20000;
}

function withBaseConfig(config: Pick<AIConfig, "provider" | "apiKey" | "error">, env: Record<string, string | undefined>): AIConfig {
  return {
    ...config,
    chatModel: env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    ttsModel: env.OPENAI_TTS_MODEL || "tts-1",
    ttsVoice: env.OPENAI_TTS_VOICE || "nova",
    timeoutMs: readTimeoutMs(env),
  } as AIConfig;
}

export function readAIConfig(env: Record<string, string | undefined> = process.env): AIConfig {
  const forcedProvider = env.AI_PROVIDER?.trim().toLowerCase();
  const openAIKey = readSecret(env.OPENAI_API_KEY);
  const geminiKey = readSecret(env.GEMINI_API_KEY);

  if (forcedProvider && forcedProvider !== "openai" && forcedProvider !== "gemini") {
    return withBaseConfig({
      provider: null,
      apiKey: null,
      error: 'AI_PROVIDER must be "openai" or "gemini".',
    }, env);
  }

  if (forcedProvider === "openai") {
    return openAIKey
      ? withBaseConfig({ provider: "openai", apiKey: openAIKey, error: null }, env)
      : withBaseConfig({ provider: null, apiKey: null, error: "OPENAI_API_KEY is not configured on the server." }, env);
  }

  if (forcedProvider === "gemini") {
    return geminiKey
      ? withBaseConfig({ provider: "gemini", apiKey: geminiKey, error: null }, env)
      : withBaseConfig({ provider: null, apiKey: null, error: "GEMINI_API_KEY is not configured on the server." }, env);
  }

  if (openAIKey) {
    return withBaseConfig({ provider: "openai", apiKey: openAIKey, error: null }, env);
  }

  if (geminiKey) {
    return withBaseConfig({ provider: "gemini", apiKey: geminiKey, error: null }, env);
  }

  return withBaseConfig({
    provider: null,
    apiKey: null,
    error: "OPENAI_API_KEY or GEMINI_API_KEY is not configured on the server.",
  }, env);
}

export function buildOpenAIChatMessages(systemInstruction: string, messages: HinaHistoryMessage[]) {
  return [
    { role: "system" as const, content: systemInstruction },
    ...messages.map((message) => ({
      role: message.role === "model" || message.role === "assistant" ? "assistant" as const : "user" as const,
      content: message.text,
    })),
  ];
}
