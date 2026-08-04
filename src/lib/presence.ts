export type PresenceStatus =
  | "online"
  | "sleeping"
  | "coffee"
  | "reading"
  | "drawing"
  | "walking"
  | "daydreaming"
  | "preparing"
  | "thinking"
  | "speaking";

export interface PresenceDefinition {
  label: string;
  dotClass: string;
  showsIndicator: boolean;
  textClass: string;
}

export const PRESENCE_DEFINITIONS: Record<PresenceStatus, PresenceDefinition> = {
  online: { label: "Online", dotClass: "bg-[#21A366]", showsIndicator: true, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  sleeping: { label: "🌙 Sleeping", dotClass: "bg-[#21A366]", showsIndicator: false, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  coffee: { label: "☕ Making coffee", dotClass: "bg-[#21A366]", showsIndicator: false, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  reading: { label: "📚 Reading", dotClass: "bg-[#21A366]", showsIndicator: false, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  drawing: { label: "🎨 Drawing", dotClass: "bg-[#21A366]", showsIndicator: false, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  walking: { label: "🚶 Walking", dotClass: "bg-[#21A366]", showsIndicator: false, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  daydreaming: { label: "💭 Daydreaming", dotClass: "bg-[#21A366]", showsIndicator: false, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  preparing: { label: "Preparing", dotClass: "bg-[#54B9E8]", showsIndicator: true, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  thinking: { label: "Thinking", dotClass: "bg-[#2457A7]", showsIndicator: true, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
  speaking: { label: "Speaking", dotClass: "bg-[#F29A38]", showsIndicator: true, textClass: "text-[#8A817C] dark:text-[#a58ebd]" },
};

const PRESENCE_LABELS: Partial<Record<LanguageCode, Record<PresenceStatus, string>>> = {
  "zh-CN": { online: "在线", sleeping: "🌙 睡觉", coffee: "☕ 冲咖啡", reading: "📚 阅读", drawing: "🎨 画画", walking: "🚶 散步", daydreaming: "💭 发呆", preparing: "准备中", thinking: "思考中", speaking: "说话中" },
  ja: { online: "オンライン", sleeping: "🌙 睡眠中", coffee: "☕ コーヒー中", reading: "📚 読書中", drawing: "🎨 お絵描き中", walking: "🚶 散歩中", daydreaming: "💭 空想中", preparing: "準備中", thinking: "考え中", speaking: "話しています" },
  ko: { online: "온라인", sleeping: "🌙 자는 중", coffee: "☕ 커피 만드는 중", reading: "📚 독서 중", drawing: "🎨 그림 그리는 중", walking: "🚶 산책 중", daydreaming: "💭 상상 중", preparing: "준비 중", thinking: "생각 중", speaking: "말하는 중" },
  es: { online: "En línea", sleeping: "🌙 Durmiendo", coffee: "☕ Preparando café", reading: "📚 Leyendo", drawing: "🎨 Dibujando", walking: "🚶 Paseando", daydreaming: "💭 Soñando despierta", preparing: "Preparando", thinking: "Pensando", speaking: "Hablando" },
  fr: { online: "En ligne", sleeping: "🌙 Dort", coffee: "☕ Prépare un café", reading: "📚 Lit", drawing: "🎨 Dessine", walking: "🚶 Se promène", daydreaming: "💭 Rêvasse", preparing: "Prépare", thinking: "Réfléchit", speaking: "Parle" },
  de: { online: "Online", sleeping: "🌙 Schläft", coffee: "☕ Macht Kaffee", reading: "📚 Liest", drawing: "🎨 Zeichnet", walking: "🚶 Spaziert", daydreaming: "💭 Tagträumt", preparing: "Bereitet vor", thinking: "Denkt nach", speaking: "Spricht" },
};

export function presenceLabel(status: PresenceStatus, displayLanguage: LanguageCode) {
  return PRESENCE_LABELS[displayLanguage]?.[status] || PRESENCE_DEFINITIONS[status].label;
}

function newYorkParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function stableIndex(seed: string, length: number) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

export function ambientPresence(now = new Date()): PresenceStatus {
  const ny = newYorkParts(now);
  const slot = Math.floor(ny.minute / 30);
  const seed = `${ny.date}:${ny.hour}:${slot}`;
  let options: PresenceStatus[];

  if (ny.hour < 6) options = ["sleeping", "sleeping", "sleeping", "daydreaming"];
  else if (ny.hour < 9) options = ["coffee", "coffee", "walking", "online"];
  else if (ny.hour < 12) options = ["reading", "online", "coffee", "walking"];
  else if (ny.hour < 17) options = ["reading", "drawing", "online", "daydreaming", "walking"];
  else if (ny.hour < 21) options = ["walking", "drawing", "coffee", "online", "reading"];
  else options = ["reading", "daydreaming", "online", "sleeping"];

  return options[stableIndex(seed, options.length)];
}

export function resolvePresence(input: {
  ambient: PresenceStatus;
  preparing?: boolean;
  thinking?: boolean;
  speaking?: boolean;
}): PresenceStatus {
  if (input.speaking) return "speaking";
  if (input.thinking) return "thinking";
  if (input.preparing) return "preparing";
  return input.ambient;
}
import type { LanguageCode } from "../types";
