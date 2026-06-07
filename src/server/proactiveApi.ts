import type { ProactivePromptInput } from "./proactive";

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function buildProactivePromptInput(input: Record<string, unknown>): ProactivePromptInput {
  const localDate = boundedString(input.localDate, 32) || new Date().toISOString().slice(0, 10);
  const favoriteTopics = Array.isArray(input.favoriteTopics)
    ? input.favoriteTopics
      .map((topic) => boundedString(topic, 40))
      .filter((topic): topic is string => topic !== null)
      .slice(0, 3)
    : [];
  const recentMessages = Array.isArray(input.recentMessages)
    ? input.recentMessages
      .map((message) => boundedString(message, 240))
      .filter((message): message is string => message !== null)
      .slice(-6)
    : [];

  return {
    localDate,
    favoriteTopics,
    recentMessages,
  };
}

export function parseLastInteractionAt(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
