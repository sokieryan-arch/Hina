import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronRight,
  CircleDashed,
  Heart,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import type { HinaSpaceView, Message, WishlistItem, WishlistKind } from "../types";

interface HinaSpaceProps {
  view: HinaSpaceView;
  messages: Message[];
  wishlistItems: WishlistItem[];
  onNavigate: (view: HinaSpaceView) => void;
  onWishlistItemsChange: (items: WishlistItem[]) => void;
}

const SPACE_ITEMS = [
  {
    view: "moments" as const,
    emoji: "📸",
    title: "Moments",
    copy: "Tiny scenes from Hina's New York days.",
    className: "bg-[#FFF4D8] border-[#F1D89A] text-[#755315] dark:bg-[#33263e] dark:border-[#5a4669] dark:text-[#f6d98e]",
  },
  {
    view: "notes" as const,
    emoji: "✍️",
    title: "Study",
    copy: "The useful bits Hina saved from your chats.",
    className: "bg-[#EAF5F2] border-[#BDDCD5] text-[#285F57] dark:bg-[#17303a] dark:border-[#2e5661] dark:text-[#a9ddd3]",
  },
  {
    view: "wishlist" as const,
    emoji: "🎒",
    title: "Wishlist",
    copy: "Goals, places and promises for later.",
    className: "bg-[#F1F1E5] border-[#D6D4B9] text-[#5A5A40] dark:bg-[#2c2a31] dark:border-[#504c59] dark:text-[#dad7b5]",
  },
  {
    view: "relationship" as const,
    emoji: "❤️",
    title: "Relationship",
    copy: "A quiet little record of everything between you.",
    className: "bg-[#FBEAEC] border-[#E9C5CA] text-[#82434C] dark:bg-[#3a1f35] dark:border-[#633451] dark:text-[#f1b8ca]",
  },
];

const MOMENTS = [
  {
    id: "central-park-book",
    title: "Central Park margin note",
    body: "Hina spent the afternoon pretending to read a philosophy book, then underlined the snack receipt instead. Very academic.",
  },
  {
    id: "subway-lizard",
    title: "Subway side quest",
    body: "Someone on the train had a tiny lizard in a sweater. Hina has decided New York is basically a vocabulary test with doors.",
  },
  {
    id: "coffee-window",
    title: "Window-seat coffee",
    body: "Hina found a small coffee shop where the barista remembers regulars by their adjectives. She is now 'the gummy bear girl'.",
  },
];

function PageShell({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return (
    <main className={`flex-1 overflow-y-auto bg-[#FDFBF7] dark:bg-[#1c1224] px-4 py-6 sm:px-7 sm:py-8 ${centered ? "flex flex-col" : ""}`}>
      <div className={`mx-auto w-full max-w-4xl ${centered ? "my-auto" : ""}`}>{children}</div>
    </main>
  );
}

function EmptyState({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className="min-h-64 flex flex-col items-center justify-center text-center px-6 text-[#8A817C] dark:text-[#a58ebd]">
      <div className="mb-4 h-12 w-12 rounded-full bg-[#F7F2E9] dark:bg-[#342042] flex items-center justify-center">{icon}</div>
      <h2 className="font-bold text-[#4A4A4A] dark:text-white">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed">{copy}</p>
    </div>
  );
}

function SpaceHome({ onNavigate }: Pick<HinaSpaceProps, "onNavigate">) {
  return (
    <PageShell centered>
      <div className="grid grid-cols-2 gap-4 sm:gap-5" data-space-grid>
        {SPACE_ITEMS.map((item, index) => (
          <motion.button
            key={item.view}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onNavigate(item.view)}
            className={`group min-h-44 sm:min-h-52 rounded-[24px] border p-4 sm:p-6 text-left shadow-[0_5px_18px_rgba(68,55,35,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(68,55,35,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] dark:shadow-none ${item.className}`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-3xl sm:text-4xl" aria-hidden="true">{item.emoji}</span>
              <ChevronRight size={19} className="opacity-50 transition-transform group-hover:translate-x-1" />
            </span>
            <span className="mt-7 block text-lg sm:text-xl font-bold tracking-normal">{item.title}</span>
            <span className="mt-2 block text-xs sm:text-sm leading-relaxed opacity-80">{item.copy}</span>
          </motion.button>
        ))}
      </div>
    </PageShell>
  );
}

function MomentsPage() {
  return (
    <PageShell>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B0792C] dark:text-[#d6bdec]">From Hina's side of the city</p>
          <p className="mt-2 text-sm text-[#7C746F] dark:text-[#a995b7]">Small scenes to keep the app feeling alive between chats.</p>
        </div>
        <Sparkles size={22} className="text-[#E0A835]" />
      </div>
      <div className="relative space-y-5 before:absolute before:left-[19px] before:top-5 before:bottom-5 before:w-px before:bg-[#E8E2D6] dark:before:bg-[#3a2347]">
        {MOMENTS.map((moment, index) => (
          <motion.article
            key={moment.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.2) }}
            className="relative pl-14"
          >
            <span className="absolute left-2.5 top-5 h-5 w-5 rounded-full border-4 border-[#FDFBF7] dark:border-[#1c1224] bg-[#FFD166] shadow-sm" />
            <div className="rounded-[22px] border border-[#E8E2D6] dark:border-[#3a2347] bg-white dark:bg-[#291a33] p-5 shadow-sm">
              <h2 className="text-base font-bold text-[#302B29] dark:text-white">{moment.title}</h2>
              <p className="mt-2 text-[15px] leading-7 text-[#45413E] dark:text-[#e5dceb]">{moment.body}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </PageShell>
  );
}

type StudyCategory = "grammar" | "vocabulary" | "expression" | "culture";

interface StudyNote {
  id: string;
  category: StudyCategory;
  title: string;
  body: string;
}

const NOTE_FILTERS: Array<{ value: "all" | StudyCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "grammar", label: "Grammar" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "expression", label: "Expressions" },
  { value: "culture", label: "Culture" },
];

const NOTE_STYLES: Record<StudyCategory, string> = {
  grammar: "border-[#F2C7A4] bg-[#FFF5EC] dark:border-[#68404d] dark:bg-[#321c2b]",
  vocabulary: "border-[#D7D2A8] bg-[#F7F6E8] dark:border-[#55513b] dark:bg-[#2c2a27]",
  expression: "border-[#BDDCD5] bg-[#EDF7F5] dark:border-[#2e5661] dark:bg-[#17303a]",
  culture: "border-[#D7C8E5] bg-[#F6F0FA] dark:border-[#533d68] dark:bg-[#2e2039]",
};

function studyCategoryForMessage(message: Message): StudyCategory {
  if (message.type === "correction" || message.tipKind === "correction") return "grammar";
  if (message.tipKind === "culture") return "culture";
  if (message.tipKind === "expression") return "expression";

  const text = message.text.toLowerCase();
  if (/\b(grammar|tense|punctuation|capitalization|sentence|grammatically|correct)\b/.test(text)) return "grammar";
  if (/\b(vocab|vocabulary|word|means|meaning|slang)\b/.test(text)) return "vocabulary";
  if (/\b(expression|phrase|idiom|say|sound|natural)\b/.test(text)) return "expression";
  if (/\b(culture|nuance|context|polite|casual)\b/.test(text)) return "culture";
  return message.type === "insight" ? "vocabulary" : "expression";
}

function titleForStudyNote(message: Message, category: StudyCategory) {
  if (message.type === "correction") return "Grammar note";
  if (category === "vocabulary") return "Vocabulary note";
  if (category === "culture") return "Culture note";
  return "Expression note";
}

function toStudyNote(message: Message): StudyNote | null {
  const isStudyMessage = message.type === "correction" || message.type === "insight" || message.type === "tip";
  if (!isStudyMessage || !message.text.trim()) return null;
  const category = studyCategoryForMessage(message);
  return {
    id: message.id,
    category,
    title: titleForStudyNote(message, category),
    body: message.text,
  };
}

function NotesPage({ messages }: Pick<HinaSpaceProps, "messages">) {
  const [filter, setFilter] = useState<"all" | StudyCategory>("all");
  const notes = messages
    .map(toStudyNote)
    .filter((note): note is StudyNote => note !== null)
    .slice()
    .reverse();
  const filteredNotes = filter === "all" ? notes : notes.filter((note) => note.category === filter);

  return (
    <PageShell>
      <div className="mb-5 flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Study categories">
        {NOTE_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${filter === item.value
              ? "border-[#5A5A40] bg-[#5A5A40] text-white dark:border-[#8b66a3] dark:bg-[#48285c]"
              : "border-[#E8E2D6] bg-white text-[#746B66] dark:border-[#3a2347] dark:bg-[#291a33] dark:text-[#bda9ca]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {filteredNotes.length === 0 ? (
        <EmptyState icon={<NotebookPen size={22} />} title="No notes in this pocket yet" copy="Chat with Hina and her most useful grammar fixes and expressions will appear here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredNotes.map((note) => (
            <article key={note.id} className={`rounded-[22px] border p-5 shadow-sm ${NOTE_STYLES[note.category]}`}>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#7A706A] dark:text-[#b9a8c5]">
                {note.category}
              </span>
              <h2 className="mt-2 text-base font-bold text-[#35312F] dark:text-white tracking-normal">{note.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#625B56] dark:text-[#d7cce0]">{note.body}</p>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}

interface WishlistFormState {
  kind: WishlistKind;
  title: string;
  details: string;
  targetDate: string;
}

const EMPTY_WISH: WishlistFormState = { kind: "goal", title: "", details: "", targetDate: "" };

function WishlistPage({ wishlistItems, onWishlistItemsChange }: Pick<HinaSpaceProps, "wishlistItems" | "onWishlistItemsChange">) {
  const [form, setForm] = useState<WishlistFormState>(EMPTY_WISH);
  const [showForm, setShowForm] = useState(false);

  const updateItems = (items: WishlistItem[]) => onWishlistItemsChange(items);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const now = Date.now();
    updateItems([{
      id: nanoid(),
      kind: form.kind,
      title,
      details: form.details.trim() || null,
      targetDate: form.targetDate || null,
      progress: 0,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }, ...wishlistItems]);
    setForm(EMPTY_WISH);
    setShowForm(false);
  };

  const updateItem = (item: WishlistItem, patch: Partial<WishlistItem>) => {
    updateItems(wishlistItems.map((entry) => entry.id === item.id ? { ...entry, ...patch, updatedAt: Date.now() } : entry));
  };

  const remove = (id: string) => updateItems(wishlistItems.filter((item) => item.id !== id));

  return (
    <PageShell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#35312F] dark:text-white">Together</h2>
          <p className="mt-1 text-xs text-[#857B74] dark:text-[#a995b7]">Goals, hooks, places and notes for future you.</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="h-10 w-10 rounded-full bg-[#5A5A40] dark:bg-[#48285c] text-white flex items-center justify-center" title="Add to list">
          {showForm ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={submit} className="mb-5 overflow-hidden rounded-[22px] border border-[#D8D6BF] dark:border-[#4f4658] bg-[#F6F5EA] dark:bg-[#29242f] p-4">
            <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
              <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as WishlistKind }))} className="rounded-xl border border-[#DED9CA] dark:border-[#4b4054] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm outline-none">
                <option value="goal">Goal</option>
                <option value="hook">Learning hook</option>
                <option value="place">Place</option>
                <option value="note">Future note</option>
              </select>
              <input required maxLength={120} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="What should we keep?" className="rounded-xl border border-[#DED9CA] dark:border-[#4b4054] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm outline-none" />
            </div>
            <textarea value={form.details} onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))} placeholder="A tiny detail (optional)" rows={2} className="mt-3 w-full resize-none rounded-xl border border-[#DED9CA] dark:border-[#4b4054] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm outline-none" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <input type="date" value={form.targetDate} onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))} className="rounded-xl border border-[#DED9CA] dark:border-[#4b4054] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm" />
              <button type="submit" className="rounded-full bg-[#2F5D54] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5">Add together</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {wishlistItems.length === 0 ? (
        <EmptyState icon={<ListChecks size={22} />} title="Your list is wonderfully empty" copy="Add a 30-day streak, an IELTS goal, a place to visit, or a note for later." />
      ) : (
        <div className="space-y-3">
          {wishlistItems.map((item) => (
            <article key={item.id} className={`rounded-[20px] border p-4 shadow-sm transition-opacity ${item.completed ? "border-[#C8DDCE] bg-[#F0F7F2] opacity-75 dark:border-[#315442] dark:bg-[#173027]" : "border-[#E2DFCF] bg-white dark:border-[#403748] dark:bg-[#291a33]"}`}>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => updateItem(item, { completed: !item.completed, progress: item.completed ? item.progress : 100 })} className={`mt-0.5 h-7 w-7 shrink-0 rounded-full border flex items-center justify-center ${item.completed ? "border-[#2F8B61] bg-[#2F8B61] text-white" : "border-[#C8C1B6] text-transparent dark:border-[#675771]"}`} title={item.completed ? "Mark incomplete" : "Mark complete"}>
                  <Check size={15} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F3EFE5] dark:bg-[#3a2a46] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7C746F] dark:text-[#c9b5d7]">{item.kind}</span>
                    {item.targetDate && <span className="text-xs text-[#9A8F88]">{item.targetDate}</span>}
                  </div>
                  <h3 className={`mt-2 font-bold text-[#3C3734] dark:text-white ${item.completed ? "line-through" : ""}`}>{item.title}</h3>
                  {item.details && <p className="mt-1 text-sm leading-6 text-[#746B66] dark:text-[#c8b9d3]">{item.details}</p>}
                  <label className="mt-4 flex items-center gap-3 text-xs font-semibold text-[#857B74] dark:text-[#a995b7]">
                    <input type="range" min={0} max={100} step={5} value={item.progress} onChange={(event) => updateItem(item, { progress: Number(event.target.value), completed: Number(event.target.value) === 100 })} className="min-w-0 flex-1 accent-[#2F8B61]" />
                    <span className="w-9 text-right">{item.progress}%</span>
                  </label>
                </div>
                <button type="button" onClick={() => remove(item.id)} className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[#A75B57] hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 size={14} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function RelationshipPage({ messages, wishlistItems }: Pick<HinaSpaceProps, "messages" | "wishlistItems">) {
  const stats = useMemo(() => {
    const realMessages = messages.filter((message) => !message.isTyping);
    const firstTimestamp = realMessages.reduce<number | null>((earliest, message) => (
      earliest === null || message.timestamp < earliest ? message.timestamp : earliest
    ), null);
    const knownDays = firstTimestamp ? Math.max(1, Math.ceil((Date.now() - firstTimestamp) / 86_400_000)) : 1;
    return [
      { label: "Known days", value: knownDays, icon: <Heart size={18} /> },
      { label: "Messages", value: realMessages.length, icon: <MessageCircle size={18} /> },
      { label: "Study notes", value: realMessages.filter((message) => message.type === "correction" || message.type === "insight").length, icon: <BookOpen size={18} /> },
      { label: "Proactive pops", value: realMessages.filter((message) => message.type === "proactive").length, icon: <Sparkles size={18} /> },
      { label: "List items", value: wishlistItems.length, icon: <ListChecks size={18} /> },
      { label: "Completed", value: wishlistItems.filter((item) => item.completed).length, icon: <Check size={18} /> },
    ];
  }, [messages, wishlistItems]);

  return (
    <PageShell>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-widest text-[#A65C68] dark:text-[#e2a6bd]">A record, not a scoreboard</p>
        <h2 className="mt-2 text-2xl font-bold text-[#302B29] dark:text-white tracking-normal">All the ordinary days add up.</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="min-h-36 rounded-[22px] border border-[#E8E2D6] dark:border-[#3a2347] bg-white dark:bg-[#291a33] p-4 shadow-sm">
            <div className="text-[#B45C6A] dark:text-[#e8a5bd]">{stat.icon}</div>
            <p className="mt-5 text-2xl font-bold text-[#302B29] dark:text-white">{stat.value.toLocaleString()}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#7C746F] dark:text-[#b5a3c1]">{stat.label}</p>
          </div>
        ))}
      </div>
      <section className="mt-8 border-t border-[#E8E2D6] dark:border-[#3a2347] pt-7">
        <h2 className="font-bold text-[#302B29] dark:text-white">Milestones</h2>
        <div className="mt-4 space-y-3">
          {[7, 30, 100].map((days) => {
            const reached = stats[0].value >= days;
            return (
              <div key={days} className="flex items-center gap-3 py-2">
                <span className={`h-9 w-9 rounded-full flex items-center justify-center ${reached ? "bg-[#FFD166] text-[#5B450E]" : "bg-[#F0ECE3] text-[#A69B93] dark:bg-[#342042] dark:text-[#806d8d]"}`}>
                  {reached ? <Check size={17} /> : <CircleDashed size={17} />}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#49423E] dark:text-[#e5dceb]">{days} days together</p>
                  <p className="text-xs text-[#8A817C] dark:text-[#a58ebd]">{reached ? "Unlocked" : "Still ahead"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}

export function HinaSpace({ view, messages, wishlistItems, onNavigate, onWishlistItemsChange }: HinaSpaceProps) {
  if (view === "space") return <SpaceHome onNavigate={onNavigate} />;
  if (view === "moments") return <MomentsPage />;
  if (view === "notes") return <NotesPage messages={messages} />;
  if (view === "wishlist") return <WishlistPage wishlistItems={wishlistItems} onWishlistItemsChange={onWishlistItemsChange} />;
  return <RelationshipPage messages={messages} wishlistItems={wishlistItems} />;
}
