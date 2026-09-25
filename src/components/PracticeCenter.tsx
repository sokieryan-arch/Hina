import { useState } from "react";
import { motion } from "motion/react";
import { AudioLines, ChevronRight, FilePenLine, Target } from "lucide-react";
import type {
  LanguageCode,
  SpeakingEvaluation,
  SpeakingEvaluationInput,
  SpeakingPart,
  SpeakingStudyCard,
  WritingEvaluation,
  WritingEvaluationInput,
} from "../types";
import { SpeakingPractice } from "./SpeakingPractice";
import { WritingPractice } from "./WritingPractice";

interface PracticeCenterProps {
  ownerId: string;
  nativeLanguage: LanguageCode;
  onEvaluateSpeaking: (input: SpeakingEvaluationInput) => Promise<SpeakingEvaluation>;
  onSaveSpeakingStudyCards: (cards: SpeakingStudyCard[], context: { part: SpeakingPart; question: string }) => Promise<void> | void;
  onEvaluateWriting: (input: WritingEvaluationInput) => Promise<WritingEvaluation>;
  onSaveWritingStudyCards: (cards: SpeakingStudyCard[], context: { question: string }) => Promise<void> | void;
}

export function PracticeCenter({
  ownerId,
  nativeLanguage,
  onEvaluateSpeaking,
  onSaveSpeakingStudyCards,
  onEvaluateWriting,
  onSaveWritingStudyCards,
}: PracticeCenterProps) {
  const [tool, setTool] = useState<"home" | "speaking" | "writing">("home");

  if (tool === "speaking") {
    return <SpeakingPractice ownerId={ownerId} nativeLanguage={nativeLanguage} onExit={() => setTool("home")} onEvaluate={onEvaluateSpeaking} onSaveStudyCards={onSaveSpeakingStudyCards} />;
  }
  if (tool === "writing") {
    return <WritingPractice ownerId={ownerId} nativeLanguage={nativeLanguage} onExit={() => setTool("home")} onEvaluate={onEvaluateWriting} onSaveStudyCards={onSaveWritingStudyCards} />;
  }

  return (
    <main className="flex flex-1 flex-col overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10">
      <div className="mx-auto my-auto w-full max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]">IELTS Practice</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[#2E2A27] dark:text-white sm:text-4xl">Choose what to sharpen today.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746B66] dark:text-[#bda9ca]">Each room keeps its own history, compares repeat attempts, and saves useful language back to Study.</p>
            </div>
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFD166] text-[#5E4812] sm:flex"><Target size={27} /></span>
          </div>

          <div className="mt-9 divide-y divide-[#E8E2D6] border-y border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">
            <button type="button" onClick={() => setTool("speaking")} className="group flex w-full items-center gap-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] sm:gap-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#E6C98A] bg-[#FFF8E7] text-[#86652A] dark:border-[#5a4669] dark:bg-[#33263e] dark:text-[#f6d98e]"><AudioLines size={25} /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-[#35312F] dark:text-white">Speaking</span><span className="mt-1 block text-sm leading-6 text-[#7C746F] dark:text-[#bda9ca]">Record Parts 1–3, receive evidence-based band feedback, and retry the same prompt.</span></span>
              <ChevronRight size={20} className="shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => setTool("writing")} className="group flex w-full items-center gap-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] sm:gap-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#BDDCD5] bg-[#EAF5F2] text-[#315E58] dark:border-[#2e5661] dark:bg-[#17303a] dark:text-[#a9ddd3]"><FilePenLine size={25} /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-[#35312F] dark:text-white">Writing Task 2</span><span className="mt-1 block text-sm leading-6 text-[#7C746F] dark:text-[#bda9ca]">Write freely or use a 40-minute timer, then revise from exact sentence evidence.</span></span>
              <ChevronRight size={20} className="shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <p className="mt-5 text-xs leading-5 text-[#9A8F88] dark:text-[#8e7b9b]">Practice estimates are designed for learning and are not official IELTS results.</p>
        </motion.div>
      </div>
    </main>
  );
}
