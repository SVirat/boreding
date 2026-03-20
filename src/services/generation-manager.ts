import { ContentSection, GeneratedContent, QuizQuestion } from '../lib/types';
import { abortGeneration } from './ai-router';

type Listener = (content: GeneratedContent) => void;

let currentContent: GeneratedContent | null = null;
let generating = false;
const listeners = new Set<Listener>();

function notify() {
  if (currentContent) {
    const snapshot = { ...currentContent, sections: [...currentContent.sections] };
    listeners.forEach((fn) => fn(snapshot));
  }
}

export function subscribeToGeneration(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isStillGenerating(): boolean {
  return generating;
}

export function getCurrentContent(): GeneratedContent | null {
  return currentContent;
}

/**
 * Initialize the generation state with placeholder pending sections.
 * Called when we know all the section allocations.
 */
export function initGeneration(
  destination: string,
  country: string,
  flightDuration: number,
  totalReadingMinutes: number,
  allocations: { id: string; title: string; icon: string; estimatedMinutes: number }[],
  topic?: string
) {
  generating = true;
  currentContent = {
    destination,
    country,
    flightDuration,
    totalReadingMinutes,
    sections: allocations.map((a) => ({
      id: a.id,
      title: a.title,
      icon: a.icon,
      estimatedMinutes: a.estimatedMinutes,
      content: '',
      completed: false,
    })),
    topic,
  };
}

/**
 * Update sections as batches complete. Replaces placeholder sections
 * with real content.
 */
export function updateSections(completedSections: ContentSection[]) {
  if (!currentContent) return;
  const sectionMap = new Map(completedSections.map((s) => [s.id, s]));
  currentContent = {
    ...currentContent,
    sections: currentContent.sections.map((s) => sectionMap.get(s.id) ?? s),
  };
  notify();
}

/**
 * Set quiz questions when they're ready.
 */
export function setQuizQuestions(questions: QuizQuestion[]) {
  if (!currentContent) return;
  currentContent = { ...currentContent, quizQuestions: questions };
  notify();
}

/**
 * Mark generation as complete.
 */
export function finishGeneration() {
  generating = false;
  notify();
}

/**
 * Clear all state (e.g., when starting a fresh generation).
 */
export function resetGeneration() {
  abortGeneration();
  currentContent = null;
  generating = false;
  listeners.clear();
}
