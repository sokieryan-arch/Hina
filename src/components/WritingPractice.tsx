import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FilePenLine,
  Gauge,
  Lightbulb,
  RotateCcw,
  Send,
  TimerOff,
} from "lucide-react";
import { WRITING_TASK_2_PROMPTS } from "../practice/writingPrompts";
import {
  createWritingAttempt,
  loadWritingAttempts,
  saveWritingAttempts,
} from "../practice/writingHistory";
import type {
  LanguageCode,
  SpeakingStudyCard,
  WritingAttempt,
  WritingEvaluation,
  WritingEvaluationInput,
  WritingScores,
  WritingTask2Prompt,
} from "../types";
import { WritingComparison, WritingHistory } from "./WritingHistory";

type WritingMode = "free" | "timed";
type WritingPhase = "drafting" | "evaluating" | "result";

interface WritingPracticeProps {
  ownerId: string;
  nativeLanguage: LanguageCode;
  onExit: () => void;
  onEvaluate: (input: WritingEvaluationInput) => Promise<WritingEvaluation>;
  onSaveStudyCards: (cards: SpeakingStudyCard[], context: { question: string }) => Promise<void> | void;
}

const TOTAL_SECONDS = 40 * 60;
const SCORE_LABELS: Array<{ key: keyof WritingScores; label: string }> = [
  { key: "taskResponse", label: "Task response" },
  { key: "coherence", label: "Coherence" },
  { key: "lexicalResource", label: "Vocabulary" },
  { key: "grammar", label: "Grammar" },
];

function countWords(value: string) {
  return value.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length || 0;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function WritingPractice({ ownerId, nativeLanguage, onExit, onEvaluate, onSaveStudyCards }: WritingPracticeProps) {
  const [prompt, setPrompt] = useState<WritingTask2Prompt | null>(null);
  const [mode, setMode] = useState<WritingMode>("free");
  const [phase, setPhase] = useState<WritingPhase>("drafting");
  const [essay, setEssay] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);
  const [attempts, setAttempts] = useState<WritingAttempt[]>(() => loadWritingAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId));
  const [currentAttempt, setCurrentAttempt] = useState<WritingAttempt | null>(null);
  const [comparisonAttempt, setComparisonAttempt] = useState<WritingAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studySaveStatus, setStudySaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const wordCount = useMemo(() => countWords(essay), [essay]);
  const timedOut = mode === "timed" && timerStarted && remainingSeconds === 0;

  useEffect(() => {
    setAttempts(loadWritingAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId));
  }, [ownerId]);

  useEffect(() => {
    if (mode !== "timed" || !timerStarted || phase !== "drafting") return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, phase, timerStarted]);

  const resetDraft = () => {
    setEssay("");
    setPhase("drafting");
    setRemainingSeconds(TOTAL_SECONDS);
    setTimerStarted(false);
    setEvaluation(null);
    setCurrentAttempt(null);
    setError(null);
    setStudySaveStatus("idle");
  };

  const choosePrompt = (nextPrompt: WritingTask2Prompt, baseline: WritingAttempt | null = null) => {
    resetDraft();
    setPrompt(nextPrompt);
    setComparisonAttempt(baseline);
  };

  const leaveDraft = () => {
    resetDraft();
    setPrompt(null);
    setComparisonAttempt(null);
  };

  const handleEssayChange = (value: string) => {
    if (mode === "timed" && !timerStarted && value.trim()) setTimerStarted(true);
    setEssay(value);
  };

  const submitEssay = async () => {
    if (!prompt || !essay.trim() || phase === "evaluating") return;
    setPhase("evaluating");
    setError(null);
    try {
      const result = await onEvaluate({ questionId: prompt.id, essay: essay.trim(), nativeLanguage });
      const previousAttempt = comparisonAttempt || attempts.find((attempt) => attempt.questionId === prompt.id) || null;
      const attempt = createWritingAttempt(nanoid(), prompt, essay.trim(), result);
      setAttempts((existing) => saveWritingAttempts(
        typeof window === "undefined" ? null : window.localStorage,
        ownerId,
        [attempt, ...existing.filter((item) => item.id !== attempt.id)],
      ));
      setComparisonAttempt(previousAttempt);
      setCurrentAttempt(attempt);
      setEvaluation(result);
      setPhase("result");
      setStudySaveStatus("saving");
      Promise.resolve(onSaveStudyCards(result.studyCards, { question: prompt.question }))
        .then(() => setStudySaveStatus("saved"))
        .catch((studyError) => {
          console.error("Failed to save writing study cards:", studyError);
          setStudySaveStatus("failed");
        });
    } catch (evaluationError) {
      setError(evaluationError instanceof Error ? evaluationError.message : "Hina could not review this draft yet.");
      setPhase("drafting");
    }
  };

  const retryStudyCards = async () => {
    if (!evaluation || !prompt || studySaveStatus === "saving") return;
    setStudySaveStatus("saving");
    try {
      await onSaveStudyCards(evaluation.studyCards, { question: prompt.question });
      setStudySaveStatus("saved");
    } catch (studyError) {
      console.error("Failed to save writing study cards:", studyError);
      setStudySaveStatus("failed");
    }
  };

  const rewriteCurrentPrompt = () => {
    const baseline = currentAttempt;
    resetDraft();
    setComparisonAttempt(baseline);
  };

  const practiceAgain = (attempt: WritingAttempt) => {
    const historicalPrompt = WRITING_TASK_2_PROMPTS.find((item) => item.id === attempt.questionId);
    if (historicalPrompt) choosePrompt(historicalPrompt, attempt);
  };

  const clearHistory = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear all locally saved writing practice history?")) return;
    setAttempts(saveWritingAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId, []));
  };

  if (!prompt) {
    return (
      <main className="flex-1 overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10">
        <div className="mx-auto w-full max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button type="button" onClick={onExit} className="mb-7 flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white">
              <ArrowLeft size={17} /> Practice home
            </button>
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#86652A] dark:text-[#d6bdec]">IELTS Writing Task 2</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-[#2E2A27] dark:text-white sm:text-4xl">Build the argument, then test it.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746B66] dark:text-[#bda9ca]">Choose an original prompt. Hina will grade only what is on the page and quote the evidence behind every positive claim.</p>
              </div>
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#DCEFEA] text-[#315E58] sm:flex"><FilePenLine size={27} /></span>
            </div>

            <div className="mt-9 divide-y divide-[#E8E2D6] border-y border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">
              {WRITING_TASK_2_PROMPTS.map((item, index) => (
                <motion.button key={item.id} type="button" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} onClick={() => choosePrompt(item)} className="group flex w-full items-center gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] sm:gap-6">
                  <span className="flex h-11 min-w-20 shrink-0 items-center justify-center rounded-lg border border-[#C8DDD8] bg-[#F1F8F6] px-3 text-xs font-bold uppercase text-[#315E58] dark:border-[#2e5661] dark:bg-[#17303a] dark:text-[#a9ddd3]">{item.topic}</span>
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-6 text-[#403A36] dark:text-[#e5dceb]">{item.question}</span>
                  <ChevronRight size={19} className="hidden shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1 sm:block" />
                </motion.button>
              ))}
            </div>

            <p className="mt-5 text-xs leading-5 text-[#9A8F88] dark:text-[#8e7b9b]">These prompts are original. AI feedback is for practice and is not an official IELTS score.</p>
            <WritingHistory attempts={attempts} onPracticeAgain={practiceAgain} onClear={clearHistory} />
          </motion.div>
        </div>
      </main>
    );
  }

  if (phase === "result" && evaluation) {
    return (
      <main className="flex-1 overflow-y-auto bg-[#FDFBF7] px-4 py-6 dark:bg-[#1c1224] sm:px-7 sm:py-8">
        <div className="mx-auto w-full max-w-4xl">
          <button type="button" onClick={leaveDraft} className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white"><ArrowLeft size={17} /> All writing prompts</button>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#E8E2D6] pb-6 dark:border-[#3a2347]">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#86652A] dark:text-[#d6bdec]">Practice estimate</p>
                <div className="mt-2 flex items-baseline gap-2"><strong className="font-display text-5xl font-semibold text-[#315E58] dark:text-[#a9ddd3]">{evaluation.estimatedBand.toFixed(1)}</strong><span className="text-sm font-semibold text-[#8A817C]">band impression</span></div>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#625B56] dark:text-[#d7cce0]">{evaluation.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#E8E2D6] bg-[#E8E2D6] dark:border-[#3a2347] dark:bg-[#3a2347] sm:grid-cols-4">
              {SCORE_LABELS.map(({ key, label }) => (
                <div key={key} className="bg-white p-4 dark:bg-[#291a33]"><strong className="block text-2xl text-[#35312F] dark:text-white">{evaluation.scores[key].toFixed(1)}</strong><span className="mt-1 block text-xs font-semibold text-[#8A817C] dark:text-[#a58ebd]">{label}</span></div>
              ))}
            </div>

            {evaluation.evidence.confidence === "low" ? (
              <p className="mt-4 rounded-lg border border-[#E8C98F] bg-[#FFF8E8] px-4 py-3 text-sm leading-6 text-[#765819] dark:border-[#6d5735] dark:bg-[#352c20] dark:text-[#f1d797]">Evidence check: {evaluation.evidence.wordCount} words. The estimate was capped at {evaluation.evidence.scoreCeiling?.toFixed(1)} because Task 2 requires at least 250 words of developed writing.</p>
            ) : null}

            {comparisonAttempt && currentAttempt ? <WritingComparison previous={comparisonAttempt} current={currentAttempt} /> : null}

            <div className="mt-7 grid gap-7 sm:grid-cols-2">
              <section>
                <h3 className="flex items-center gap-2 font-bold text-[#35312F] dark:text-white"><Check size={18} className="text-[#2F8B61]" /> What worked</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#625B56] dark:text-[#d7cce0]">{evaluation.strengths.map((item) => <li key={item}>· {item}</li>)}{evaluation.strengths.length === 0 ? <li>No evidence-backed strength could be confirmed yet.</li> : null}</ul>
              </section>
              <section>
                <h3 className="flex items-center gap-2 font-bold text-[#35312F] dark:text-white"><Lightbulb size={18} className="text-[#D28B1E]" /> Revise next</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#625B56] dark:text-[#d7cce0]">{evaluation.priorities.map((item) => <li key={item}>· {item}</li>)}</ul>
              </section>
            </div>

            {evaluation.sentenceFeedback.length > 0 ? (
              <section className="mt-8 border-t border-[#E8E2D6] pt-7 dark:border-[#3a2347]">
                <h3 className="font-display text-xl font-semibold text-[#2E2A27] dark:text-white">Sentence workshop</h3>
                <div className="mt-4 divide-y divide-[#E8E2D6] border-y border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">
                  {evaluation.sentenceFeedback.map((feedback) => (
                    <div key={`${feedback.kind}-${feedback.original}`} className="py-5">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#9B6B2F] dark:text-[#d6bdec]">{feedback.kind}</span>
                      <p className="mt-2 text-sm leading-6 text-[#8E746D] line-through decoration-[#C98275] dark:text-[#c999a9]">{feedback.original}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-[#315E58] dark:text-[#a9ddd3]">{feedback.revision}</p>
                      <p className="mt-2 text-xs leading-5 text-[#7C746F] dark:text-[#bda9ca]">{feedback.reason}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {evaluation.improvedParagraph ? (
              <section className="mt-7 border-l-2 border-[#86BDB1] bg-[#F1F8F6] px-5 py-4 dark:border-[#5aa394] dark:bg-[#17303a]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#2F6B60] dark:text-[#a9ddd3]">A stronger paragraph in your voice</h3>
                <p className="mt-3 text-sm leading-7 text-[#3E625D] dark:text-[#d1e9e5]">{evaluation.improvedParagraph}</p>
              </section>
            ) : null}

            <details className="mt-7 border-t border-[#E8E2D6] pt-5 dark:border-[#3a2347]">
              <summary className="cursor-pointer font-bold text-[#35312F] dark:text-white">Your submitted draft · {evaluation.evidence.wordCount} words</summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#625B56] dark:text-[#d7cce0]">{essay}</p>
            </details>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E2D6] pt-6 dark:border-[#3a2347]">
              {studySaveStatus === "failed" ? (
                <button type="button" onClick={retryStudyCards} className="flex items-center gap-2 text-sm font-bold text-[#A06032] dark:text-[#efbd9d]"><BookOpen size={17} /> Study cards failed · Try again</button>
              ) : (
                <span className="flex items-center gap-2 text-sm font-bold text-[#2F6B60] dark:text-[#a9ddd3]"><BookOpen size={17} /> {studySaveStatus === "saved" ? "3 cards saved to Study" : "Saving 3 cards to Study…"}</span>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={rewriteCurrentPrompt} className="flex items-center gap-2 rounded-full border border-[#D8CDBB] bg-white px-5 py-3 text-sm font-bold text-[#5D554F] dark:border-[#4b4054] dark:bg-[#291a33] dark:text-[#e5dceb]"><RotateCcw size={16} /> Rewrite task</button>
                <button type="button" onClick={leaveDraft} className="flex items-center gap-2 rounded-full bg-[#315E58] px-5 py-3 text-sm font-bold text-white dark:bg-[#6f4586]">Next prompt <ChevronRight size={16} /></button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#FDFBF7] px-4 py-5 dark:bg-[#1c1224] sm:px-7 sm:py-7">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={leaveDraft} className="flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white"><ArrowLeft size={17} /> All writing prompts</button>
          <div className="flex rounded-lg border border-[#DDD4C5] bg-[#F2EDE4] p-1 dark:border-[#4b4054] dark:bg-[#281a31]" aria-label="Writing mode">
            <button type="button" onClick={() => { setMode("free"); setTimerStarted(false); }} className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold ${mode === "free" ? "bg-white text-[#3E3935] shadow-sm dark:bg-[#3b2947] dark:text-white" : "text-[#857B74] dark:text-[#a58ebd]"}`}><TimerOff size={14} /> Free</button>
            <button type="button" onClick={() => { setMode("timed"); setRemainingSeconds(TOTAL_SECONDS); setTimerStarted(Boolean(essay.trim())); }} className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold ${mode === "timed" ? "bg-white text-[#3E3935] shadow-sm dark:bg-[#3b2947] dark:text-white" : "text-[#857B74] dark:text-[#a58ebd]"}`}><Clock3 size={14} /> Timed</button>
          </div>
        </div>

        <section className="mt-6 border-y border-[#E8E2D6] py-5 dark:border-[#3a2347]">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-widest text-[#86652A] dark:text-[#d6bdec]">{prompt.topic} · Task 2</p><h2 className="mt-2 text-lg font-bold leading-7 text-[#302B29] dark:text-white sm:text-xl">{prompt.question}</h2></div>
            <div className="text-right"><strong className={`font-display text-3xl font-semibold tabular-nums ${timedOut ? "text-[#B14F5E]" : "text-[#315E58] dark:text-[#a9ddd3]"}`}>{mode === "timed" ? formatTime(remainingSeconds) : "∞"}</strong><span className="mt-1 block text-[11px] font-semibold text-[#958A83]">{mode === "timed" && !timerStarted ? "starts when you type" : mode === "timed" ? "remaining" : "no timer"}</span></div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <textarea value={essay} onChange={(event) => handleEssayChange(event.target.value)} disabled={phase === "evaluating" || timedOut} aria-label="IELTS Writing Task 2 draft" placeholder="Write your response here…" className="min-h-[430px] w-full resize-y rounded-lg border border-[#D8CDBB] bg-white px-5 py-5 text-base leading-8 text-[#35312F] outline-none transition-shadow placeholder:text-[#B4AAA2] focus:border-[#86BDB1] focus:ring-2 focus:ring-[#86BDB1]/20 disabled:bg-[#F3EFE8] dark:border-[#4b4054] dark:bg-[#291a33] dark:text-white dark:placeholder:text-[#7f6c8b] dark:disabled:bg-[#24172c]" />
            {error ? <p className="mt-3 rounded-lg border border-[#E9C5CA] bg-[#FBEAEC] px-4 py-3 text-sm text-[#82434C] dark:border-[#633451] dark:bg-[#3a1f35] dark:text-[#f1b8ca]">{error}</p> : null}
            {timedOut ? <p className="mt-3 text-sm font-semibold text-[#A34D59] dark:text-[#f1b8ca]">Time is up. Submit this draft, or switch to Free mode to keep editing.</p> : null}
          </div>

          <aside className="border-t border-[#E8E2D6] pt-5 dark:border-[#3a2347] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div className="flex items-baseline justify-between"><strong className="font-display text-3xl font-semibold text-[#315E58] dark:text-[#a9ddd3]">{wordCount}</strong><span className="text-xs font-semibold text-[#8A817C]">/ 250 words</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ECE6DC] dark:bg-[#3a2c43]"><div className="h-full bg-[#6BAE9F] transition-[width]" style={{ width: `${Math.min(100, (wordCount / 250) * 100)}%` }} /></div>
            <p className="mt-4 text-xs leading-5 text-[#857B74] dark:text-[#a995b7]">A complete Task 2 response normally needs a clear position, developed reasons, and at least 250 words.</p>
            {wordCount > 0 && wordCount < 250 ? <p className="mt-4 text-xs font-semibold leading-5 text-[#9B6B2F] dark:text-[#efbd9d]">Underlength answers receive a conservative score ceiling.</p> : null}
            <button type="button" onClick={submitEssay} disabled={!essay.trim() || phase === "evaluating"} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#315E58] px-5 py-3 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#6f4586]">{phase === "evaluating" ? <><Gauge size={17} className="animate-pulse" /> Reviewing…</> : <><Send size={16} /> Get feedback</>}</button>
          </aside>
        </div>
      </div>
    </main>
  );
}
