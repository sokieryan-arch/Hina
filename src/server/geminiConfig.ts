export function readGeminiApiKey(env: Record<string, string | undefined> = process.env) {
  const raw = env.GEMINI_API_KEY?.trim();
  if (!raw) return null;

  const quote = raw[0];
  const unquoted = (quote === "\"" || quote === "'") && raw.endsWith(quote)
    ? raw.slice(1, -1).trim()
    : raw;

  return unquoted || null;
}
