export interface ChatPlaceholderContext {
  presence?: string;
}

const DEFAULT_PLACEHOLDERS = [
  "Tell Hina what happened today...",
  "Drop one English sentence here...",
  "What are we practicing today?",
  "Reply to Hina in English...",
  "Ask Hina for a tiny correction...",
];

const PRESENCE_PLACEHOLDERS: Record<string, string[]> = {
  reading: [
    "Interrupt Hina's book with one sentence...",
    "What line should Hina help polish?",
  ],
  coffee: [
    "Send a thought before Hina's coffee cools...",
    "What should we chat about over coffee?",
  ],
  walking: [
    "Catch Hina mid-walk with a sentence...",
    "Describe your day in one casual line...",
  ],
  thinking: ["Hina is thinking, but you can queue the next thought..."],
  speaking: ["Hina is speaking. Type the next reply when ready..."],
};

function keyFromPresence(presence: string | undefined) {
  return presence?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "";
}

export function getChatPlaceholderCandidates(context: ChatPlaceholderContext = {}) {
  return PRESENCE_PLACEHOLDERS[keyFromPresence(context.presence)] || DEFAULT_PLACEHOLDERS;
}

export function pickChatPlaceholder(options: {
  context?: ChatPlaceholderContext;
  random?: () => number;
} = {}) {
  const candidates = getChatPlaceholderCandidates(options.context);
  const random = options.random || Math.random;
  const value = random();
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999999) : 0;
  return candidates[Math.floor(safeValue * candidates.length)] || DEFAULT_PLACEHOLDERS[0];
}
