import type { LanguageCode } from "../types";

export interface ChatPlaceholderContext {
  presence?: string;
  targetLanguage?: LanguageCode;
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

const LANGUAGE_PLACEHOLDERS: Partial<Record<LanguageCode, string[]>> = {
  "zh-CN": ["告诉 Hina 今天发生了什么……", "用一句中文开始今天的练习……", "今天想和 Hina 聊什么？"],
  ja: ["今日あったことをHinaに話して…", "一文から練習を始めよう…", "今日は何を話す？"],
  ko: ["오늘 있었던 일을 Hina에게 말해 주세요…", "한 문장으로 연습을 시작해요…", "오늘은 무엇을 이야기할까요?"],
  es: ["Cuéntale a Hina qué pasó hoy…", "Empieza con una frase…", "¿Qué practicamos hoy?"],
  fr: ["Racontez à Hina votre journée…", "Commencez par une phrase…", "Qu'est-ce qu'on travaille aujourd'hui ?"],
  de: ["Erzähl Hina, was heute passiert ist…", "Starte mit einem Satz…", "Was üben wir heute?"],
};

function keyFromPresence(presence: string | undefined) {
  return presence?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "";
}

export function getChatPlaceholderCandidates(context: ChatPlaceholderContext = {}) {
  if (context.targetLanguage && context.targetLanguage !== "en") {
    return LANGUAGE_PLACEHOLDERS[context.targetLanguage] || DEFAULT_PLACEHOLDERS;
  }
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
