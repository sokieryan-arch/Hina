import type { WritingTask2Prompt } from "../types";

export const WRITING_TASK_2_PROMPTS: WritingTask2Prompt[] = [
  {
    id: "task2-city-green-space",
    topic: "Cities",
    question: "Some people believe cities should use more public land for parks and gardens rather than for new housing. To what extent do you agree or disagree?",
  },
  {
    id: "task2-remote-work",
    topic: "Work",
    question: "Working from home is becoming common in many countries. Do the advantages of this development outweigh the disadvantages?",
  },
  {
    id: "task2-school-life-skills",
    topic: "Education",
    question: "Schools should spend more time teaching practical life skills and less time teaching traditional academic subjects. Discuss both views and give your own opinion.",
  },
  {
    id: "task2-tourism-local-culture",
    topic: "Culture",
    question: "International tourism can sometimes cause local traditions to become less authentic. What problems can this create, and what measures could reduce them?",
  },
  {
    id: "task2-public-transport",
    topic: "Transport",
    question: "Some people think public transport should be free in large cities. What are the advantages and disadvantages of this policy?",
  },
  {
    id: "task2-technology-older-people",
    topic: "Technology",
    question: "Many older people find it difficult to use modern technology. Why does this happen, and how can they be encouraged to use it?",
  },
];

export function findWritingTask2Prompt(questionId: string) {
  return WRITING_TASK_2_PROMPTS.find((prompt) => prompt.id === questionId) || null;
}
