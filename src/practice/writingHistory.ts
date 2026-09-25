import type { WritingAttempt, WritingEvaluation, WritingScores, WritingTask2Prompt } from "../types";

const STORAGE_PREFIX = "hina-writing-attempts-v1";
export const MAX_WRITING_ATTEMPTS = 20;
const SCORE_KEYS: Array<keyof WritingScores> = ["taskResponse", "coherence", "lexicalResource", "grammar"];

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function writingHistoryStorageKey(ownerId: string) {
  return `${STORAGE_PREFIX}:${ownerId || "guest"}`;
}

function isAttempt(value: unknown): value is WritingAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Partial<WritingAttempt>;
  return typeof attempt.id === "string"
    && typeof attempt.questionId === "string"
    && typeof attempt.question === "string"
    && typeof attempt.topic === "string"
    && typeof attempt.createdAt === "number"
    && typeof attempt.essay === "string"
    && typeof attempt.estimatedBand === "number"
    && Boolean(attempt.scores)
    && SCORE_KEYS.every((key) => typeof attempt.scores?.[key] === "number")
    && typeof attempt.summary === "string"
    && Array.isArray(attempt.priorities)
    && Array.isArray(attempt.sentenceFeedback)
    && typeof attempt.improvedParagraph === "string"
    && Array.isArray(attempt.studyCards);
}

export function loadWritingAttempts(storage: StorageLike | null, ownerId: string) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(writingHistoryStorageKey(ownerId)) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter(isAttempt).sort((left, right) => right.createdAt - left.createdAt).slice(0, MAX_WRITING_ATTEMPTS)
      : [];
  } catch {
    return [];
  }
}

export function saveWritingAttempts(storage: StorageLike | null, ownerId: string, attempts: WritingAttempt[]) {
  const next = attempts.slice(0, MAX_WRITING_ATTEMPTS);
  storage?.setItem(writingHistoryStorageKey(ownerId), JSON.stringify(next));
  return next;
}

export function createWritingAttempt(
  id: string,
  prompt: WritingTask2Prompt,
  essay: string,
  evaluation: WritingEvaluation,
  createdAt = Date.now(),
): WritingAttempt {
  return {
    id,
    questionId: prompt.id,
    question: prompt.question,
    topic: prompt.topic,
    createdAt,
    essay,
    estimatedBand: evaluation.estimatedBand,
    scores: evaluation.scores,
    summary: evaluation.summary,
    priorities: evaluation.priorities,
    sentenceFeedback: evaluation.sentenceFeedback,
    improvedParagraph: evaluation.improvedParagraph,
    studyCards: evaluation.studyCards,
  };
}

export function averageWritingScores(attempts: WritingAttempt[]) {
  if (attempts.length === 0) return null;
  const total = attempts.reduce((result, attempt) => {
    result.estimatedBand += attempt.estimatedBand;
    for (const key of SCORE_KEYS) result.scores[key] += attempt.scores[key];
    return result;
  }, {
    estimatedBand: 0,
    scores: { taskResponse: 0, coherence: 0, lexicalResource: 0, grammar: 0 },
  });
  const rounded = (value: number) => Math.round((value / attempts.length) * 10) / 10;
  return {
    estimatedBand: rounded(total.estimatedBand),
    scores: {
      taskResponse: rounded(total.scores.taskResponse),
      coherence: rounded(total.scores.coherence),
      lexicalResource: rounded(total.scores.lexicalResource),
      grammar: rounded(total.scores.grammar),
    },
  };
}
