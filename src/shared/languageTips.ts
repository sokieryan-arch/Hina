export type LanguageTipType = "correction" | "expression" | "culture";

export interface LanguageTip {
  type: LanguageTipType;
  title: string;
  body: string;
  example?: string;
  original?: string;
  suggestion?: string;
}

const FALLBACK_TIPS: LanguageTip[] = [
  {
    type: "correction",
    title: "Tiny fluency check",
    body: "If your sentence is already clear, Hina will keep this light and focus on sounding natural.",
  },
  {
    type: "expression",
    title: "Phrase to steal",
    body: "Try reusing one useful phrase from Hina's reply in your next message.",
  },
];

const TIP_TYPES = new Set<LanguageTipType>(["correction", "expression", "culture"]);

function truncate(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return undefined;
  return text.slice(0, maxLength);
}

function normalizeTip(value: unknown): LanguageTip | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const type = source.type;

  if (typeof type !== "string" || !TIP_TYPES.has(type as LanguageTipType)) {
    return null;
  }

  const title = truncate(source.title, 80);
  const body = truncate(source.body, 360);
  if (!title || !body) return null;

  const tip: LanguageTip = {
    type: type as LanguageTipType,
    title,
    body,
  };

  const example = truncate(source.example, 180);
  const original = truncate(source.original, 180);
  const suggestion = truncate(source.suggestion, 180);

  if (example) tip.example = example;
  if (original) tip.original = original;
  if (suggestion) tip.suggestion = suggestion;

  return tip;
}

export function normalizeLanguageTips(input: unknown): LanguageTip[] {
  const normalized = Array.isArray(input)
    ? input.map(normalizeTip).filter((tip): tip is LanguageTip => tip !== null)
    : [];

  const tips = normalized.slice(0, 2);
  for (const fallback of FALLBACK_TIPS) {
    if (tips.length >= 2) break;
    if (!tips.some((tip) => tip.type === fallback.type)) {
      tips.push(fallback);
    }
  }

  return tips.slice(0, 2);
}
