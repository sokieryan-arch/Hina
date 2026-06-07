export type Role = "user" | "model";
export type MessageType = "response" | "correction" | "insight" | "tip" | "proactive";
export type TipKind = "correction" | "expression" | "culture";

export interface Message {
  id: string;
  role: Role;
  text: string;
  // Metadata for AI messages
  isTyping?: boolean;
  type?: MessageType;
  tipKind?: TipKind;
  timestamp: number;
}

export interface ProactiveSettings {
  enabled: boolean;
  minHoursBetweenNudges: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  favoriteTopics: string[];
}
