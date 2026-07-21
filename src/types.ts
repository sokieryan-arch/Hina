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

export type HinaSpaceView = "space" | "moments" | "notes" | "wishlist" | "relationship";
export type AppView = "chat" | HinaSpaceView;
export type WishlistKind = "goal" | "hook" | "place" | "note";

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
