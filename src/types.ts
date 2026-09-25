export type Role = "user" | "model";
export type MessageType = "response" | "correction" | "insight" | "tip" | "proactive";

export interface Message {
  id: string;
  role: Role;
  text: string;
  isTyping?: boolean;
  type?: MessageType;
  tipKind?: "correction" | "expression" | "culture";
  timestamp: number;
}

export interface ProactiveSettings {
  enabled: boolean;
  minHoursBetweenNudges: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  favoriteTopics: string[];
}

export type LanguageCode = "en" | "zh-CN" | "ja" | "ko" | "es" | "pt" | "fr" | "de";

export interface LanguageSettings {
  targetLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
}

export interface UserProfile {
  displayName: string;
  photoURL: string | null;
}

export interface BillingSummary {
  plan: "free" | "pro";
  isPro: boolean;
  dailyLimit: number | null;
  usedToday: number;
  remainingToday: number | null;
  resetAt: string;
}

export type HinaSpaceView = "space" | "practice" | "moments" | "notes" | "wishlist" | "relationship";
export type AppView = "chat" | HinaSpaceView;
export type WishlistKind = "goal" | "hook" | "place" | "note";

export type SpeakingPart = 1 | 2 | 3;

export interface SpeakingQuestion {
  id: string;
  part: SpeakingPart;
  eyebrow: string;
  question: string;
  cues: string[];
  prepSeconds: number;
  answerSeconds: number;
}

export interface SpeakingScores {
  fluency: number;
  lexicalResource: number;
  grammar: number;
  pronunciation: number;
}

export type SpeakingStudyCardKind = "grammar" | "vocabulary" | "expression" | "pronunciation";

export interface SpeakingStudyCard {
  kind: SpeakingStudyCardKind;
  title: string;
  body: string;
}

export interface SpeakingEvidence {
  transcribedWordCount: number;
  scoreCeiling: number | null;
  confidence: "low" | "medium" | "high";
}

export interface SpeakingEvaluation {
  transcript: string;
  summary: string;
  estimatedBand: number;
  scores: SpeakingScores;
  strengths: string[];
  priorities: string[];
  improvedAnswer: string;
  studyNote: string;
  studyCards: SpeakingStudyCard[];
  evidence: SpeakingEvidence;
}

export interface SpeakingEvaluationInput {
  questionId: string;
  audioBase64: string;
  mimeType: string;
  nativeLanguage: LanguageCode;
}

export interface SpeakingAttempt {
  id: string;
  questionId: string;
  question: string;
  part: SpeakingPart;
  createdAt: number;
  estimatedBand: number;
  scores: SpeakingScores;
  transcript: string;
  summary: string;
  priorities: string[];
  improvedAnswer: string;
  studyCards: SpeakingStudyCard[];
}

export interface WritingTask2Prompt {
  id: string;
  topic: string;
  question: string;
}

export interface WritingScores {
  taskResponse: number;
  coherence: number;
  lexicalResource: number;
  grammar: number;
}

export interface WritingSentenceFeedback {
  kind: "grammar" | "vocabulary" | "cohesion";
  original: string;
  revision: string;
  reason: string;
}

export interface WritingEvidence {
  wordCount: number;
  scoreCeiling: number | null;
  confidence: "low" | "medium" | "high";
}

export interface WritingEvaluation {
  summary: string;
  estimatedBand: number;
  scores: WritingScores;
  strengths: string[];
  priorities: string[];
  sentenceFeedback: WritingSentenceFeedback[];
  improvedParagraph: string;
  studyCards: SpeakingStudyCard[];
  evidence: WritingEvidence;
}

export interface WritingEvaluationInput {
  questionId: string;
  essay: string;
  nativeLanguage: LanguageCode;
}

export interface WritingAttempt {
  id: string;
  questionId: string;
  question: string;
  topic: string;
  createdAt: number;
  essay: string;
  estimatedBand: number;
  scores: WritingScores;
  summary: string;
  priorities: string[];
  sentenceFeedback: WritingSentenceFeedback[];
  improvedParagraph: string;
  studyCards: SpeakingStudyCard[];
}

export interface WishlistItem {
  id: string;
  kind: WishlistKind;
  title: string;
  details: string | null;
  progress: number;
  completed: boolean;
  targetDate: string | null;
  createdAt: number;
  updatedAt: number;
}
