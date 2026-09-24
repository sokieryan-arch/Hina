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

export interface SpeakingEvaluation {
  transcript: string;
  summary: string;
  estimatedBand: number;
  scores: SpeakingScores;
  strengths: string[];
  priorities: string[];
  improvedAnswer: string;
  studyNote: string;
}

export interface SpeakingEvaluationInput {
  questionId: string;
  audioBase64: string;
  mimeType: string;
  nativeLanguage: LanguageCode;
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
