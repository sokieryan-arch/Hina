export type Role = "user" | "model";

export interface Message {
  id: string;
  role: Role;
  text: string;
  // Metadata for AI messages
  isTyping?: boolean;
  type?: "response" | "correction" | "insight";
  timestamp: number;
}
