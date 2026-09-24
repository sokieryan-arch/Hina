import { isLanguageCode, languageNameInEnglish } from "../i18n/languages.js";
import { findSpeakingQuestion } from "../practice/speakingQuestions.js";
import type { LanguageCode, SpeakingEvaluation, SpeakingEvaluationInput, SpeakingScores } from "../types.js";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
]);

const MAX_AUDIO_BASE64_LENGTH = 3_600_000;

export interface ValidatedSpeakingEvaluationInput extends SpeakingEvaluationInput {
  nativeLanguage: LanguageCode;
}

function invalid(message: string): never {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  throw error;
}

export function readSpeakingEvaluationInput(input: unknown): ValidatedSpeakingEvaluationInput {
  if (!input || typeof input !== "object") invalid("Invalid speaking evaluation request.");
  const candidate = input as Partial<SpeakingEvaluationInput>;
  const questionId = typeof candidate.questionId === "string" ? candidate.questionId.trim() : "";
  const audioBase64 = typeof candidate.audioBase64 === "string" ? candidate.audioBase64.trim() : "";
  const mimeType = typeof candidate.mimeType === "string"
    ? candidate.mimeType.split(";")[0].trim().toLowerCase()
    : "";

  if (!findSpeakingQuestion(questionId)) invalid("Unknown speaking question.");
  if (!ALLOWED_AUDIO_TYPES.has(mimeType)) invalid("Unsupported audio format.");
  if (!audioBase64 || audioBase64.length > MAX_AUDIO_BASE64_LENGTH || !/^[a-zA-Z0-9+/=]+$/.test(audioBase64)) {
    invalid("Audio recording is missing or too large.");
  }

  return {
    questionId,
    audioBase64,
    mimeType,
    nativeLanguage: isLanguageCode(candidate.nativeLanguage) ? candidate.nativeLanguage : "zh-CN",
  };
}

export function buildSpeakingEvaluationPrompt(input: ValidatedSpeakingEvaluationInput) {
  const question = findSpeakingQuestion(input.questionId);
  if (!question) throw new Error("Speaking question disappeared after validation.");
  const nativeLanguage = languageNameInEnglish(input.nativeLanguage);
  const cueText = question.cues.length > 0 ? `\nCue points:\n- ${question.cues.join("\n- ")}` : "";

  return `You are Hina acting as a supportive IELTS Speaking practice evaluator, not an official IELTS examiner.
Listen carefully to the attached audio and evaluate only what is actually audible.

Practice prompt (Part ${question.part}):
${question.question}${cueText}

Output contract:
- Transcribe the response faithfully in English. Do not silently fix errors in the transcript.
- Give conservative half-band estimates from 0 to 9 for fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation.
- estimatedBand is the average impression, rounded to the nearest half band.
- Explain summary, strengths, priorities, and studyNote in ${nativeLanguage}.
- Keep improvedAnswer in natural English and preserve the speaker's original ideas rather than inventing a completely different story.
- studyNote must be a compact reusable learning card with a short heading and 2-4 practical points.
- If the recording is silent or unintelligible, use a transcript that says so, keep scores low, and explain how to retry.
- Never describe this result as an official IELTS score.`;
}

function halfBand(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(9, Math.round(parsed * 2) / 2));
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function textList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, 4)
    : [];
}

export function normalizeSpeakingEvaluation(input: unknown): SpeakingEvaluation {
  const data = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rawScores = data.scores && typeof data.scores === "object" ? data.scores as Record<string, unknown> : {};
  const scores: SpeakingScores = {
    fluency: halfBand(rawScores.fluency),
    lexicalResource: halfBand(rawScores.lexicalResource),
    grammar: halfBand(rawScores.grammar),
    pronunciation: halfBand(rawScores.pronunciation),
  };

  return {
    transcript: text(data.transcript, "No clear speech was detected."),
    summary: text(data.summary, "Hina could not produce a full evaluation for this recording."),
    estimatedBand: halfBand(data.estimatedBand),
    scores,
    strengths: textList(data.strengths),
    priorities: textList(data.priorities),
    improvedAnswer: text(data.improvedAnswer),
    studyNote: text(data.studyNote),
  };
}
