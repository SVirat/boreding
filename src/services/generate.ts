import { aiGenerate } from './ai-router';
import {
  buildSectionAllocations,
  buildBatchPrompt,
  buildQuizPrompt,
  buildTopicValidationPrompt,
  buildTopicSectionsPrompt,
  buildTopicBatchPrompt,
  buildTopicQuizPrompt,
  buildTopicAllocations,
  sectionTargetWords,
  getSectionCount,
} from '../lib/content';
import { ContentSection, GeneratedContent, QuizQuestion, StreamState } from '../lib/types';
import {
  initGeneration,
  updateSections,
  setQuizQuestions,
  finishGeneration,
  resetGeneration,
} from './generation-manager';

const BATCH_SIZE = 4;

/** Extract JSON from LLM output that may include markdown fences or surrounding text. */
function extractJSON(raw: string): string {
  // Try to find a JSON code fence first
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // Otherwise try to find a JSON array or object
  const jsonMatch = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) return jsonMatch[1].trim();
  // Last resort: strip common wrappers
  return raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
}

function parseBatchResponse(
  raw: string,
  allocations: { id: string; title: string; icon: string; estimatedMinutes: number }[]
): Record<string, string> {
  const result: Record<string, string> = {};
  const delimiter = /---SECTION:\s*(\S+)---/g;
  const parts: { id: string; start: number }[] = [];

  let match;
  while ((match = delimiter.exec(raw)) !== null) {
    parts.push({ id: match[1], start: match.index + match[0].length });
  }

  if (parts.length === 0) {
    const chunkSize = Math.floor(raw.length / allocations.length);
    allocations.forEach((a, i) => {
      const start = i * chunkSize;
      const end = i === allocations.length - 1 ? raw.length : (i + 1) * chunkSize;
      result[a.id] = raw.slice(start, end).trim();
    });
    return result;
  }

  for (let i = 0; i < parts.length; i++) {
    const end = i < parts.length - 1 ? raw.lastIndexOf('---SECTION:', parts[i + 1].start) : raw.length;
    result[parts[i].id] = raw.slice(parts[i].start, end).trim();
  }

  for (const a of allocations) {
    if (!result[a.id]) {
      result[a.id] = 'Content for this section was not generated. Try refreshing.';
    }
  }

  return result;
}

export interface GenerateCallbacks {
  onStreamState: (state: StreamState) => void;
  onError: (message: string) => void;
  onFirstBatchReady?: () => void;
}

export async function generateContent(
  destination: string,
  country: string,
  flightDurationMinutes: number,
  topic?: string,
  callbacks?: GenerateCallbacks
): Promise<GeneratedContent> {
  const cleanTopic = topic?.trim() || null;
  const totalReadingMinutes = Math.round(flightDurationMinutes * 0.85);

  // Step 0: Validate custom topic
  if (cleanTopic) {
    callbacks?.onStreamState({
      destination,
      country,
      topic: cleanTopic,
      totalSections: 0,
      sectionTitles: [],
      completedCount: 0,
      currentIndex: -1,
      currentTitle: 'Validating topic…',
    });

    try {
      const validationRaw = await aiGenerate({
        prompt: buildTopicValidationPrompt(cleanTopic),
        maxTokens: 200,
        temperature: 0.2,
      });
      const cleaned = extractJSON(validationRaw);
      const validation = JSON.parse(cleaned);
      if (!validation.valid) {
        throw new Error(validation.reason || `"${cleanTopic}" doesn't seem like a valid learning topic.`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('doesn\'t seem')) throw err;
      // Validation failed to parse — proceed anyway
    }
  }

  // Step 1: Determine sections
  let allocations: { id: string; title: string; icon: string; estimatedMinutes: number }[];

  if (cleanTopic) {
    const sectionCount = getSectionCount(totalReadingMinutes);

    try {
      const sectionsRaw = await aiGenerate({
        prompt: buildTopicSectionsPrompt(cleanTopic, sectionCount),
        maxTokens: 1000,
        temperature: 0.5,
      });
      const cleanedSections = extractJSON(sectionsRaw);
      const sectionTitles = JSON.parse(cleanedSections) as { id: string; title: string }[];
      allocations = buildTopicAllocations(totalReadingMinutes, sectionTitles);
    } catch {
      const fallbackTitles = Array.from({ length: sectionCount }, (_, i) => ({
        id: `section-${i + 1}`,
        title: `Part ${i + 1}`,
      }));
      allocations = buildTopicAllocations(totalReadingMinutes, fallbackTitles);
    }

  } else {
    allocations = buildSectionAllocations(totalReadingMinutes);
  }

  callbacks?.onStreamState({
    destination,
    country,
    topic: cleanTopic ?? undefined,
    totalSections: allocations.length,
    sectionTitles: allocations.map((a) => ({ id: a.id, title: a.title, icon: a.icon })),
    completedCount: 0,
    currentIndex: 0,
    currentTitle: allocations[0]?.title ?? '',
  });

  // Initialize generation manager with placeholder sections
  resetGeneration();
  initGeneration(destination, country, flightDurationMinutes, totalReadingMinutes, allocations, cleanTopic ?? undefined);

  // Step 2: Generate content in batches
  const batches: (typeof allocations)[] = [];
  for (let i = 0; i < allocations.length; i += BATCH_SIZE) {
    batches.push(allocations.slice(i, i + BATCH_SIZE));
  }

  const allSections: ContentSection[] = [];
  let sectionIndex = 0;
  let quizPromise: Promise<QuizQuestion[]> | null = null;
  let firstBatchFired = false;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    // On the last batch, start quiz generation concurrently using sections we already have
    if (batchIdx === batches.length - 1 && allSections.length >= 2) {
      const sectionsSnapshot = [...allSections];
      quizPromise = (async () => {
        try {
          const quizPrompt = cleanTopic
            ? buildTopicQuizPrompt(cleanTopic, sectionsSnapshot)
            : buildQuizPrompt(destination, country, sectionsSnapshot);
          const rawQuiz = await aiGenerate({ prompt: quizPrompt, maxTokens: 1500, temperature: 0.5 });
          const cleaned = extractJSON(rawQuiz);
          return JSON.parse(cleaned) as QuizQuestion[];
        } catch {
          return [];
        }
      })();
    }

    callbacks?.onStreamState({
      destination,
      country,
      topic: cleanTopic ?? undefined,
      totalSections: allocations.length,
      sectionTitles: allocations.map((a) => ({ id: a.id, title: a.title, icon: a.icon })),
      completedCount: sectionIndex,
      currentIndex: sectionIndex,
      currentTitle: batch[0].title,
    });

    const batchPrompt = cleanTopic
      ? buildTopicBatchPrompt(cleanTopic, batch)
      : buildBatchPrompt(destination, country, batch);
    const batchWords = batch.reduce((sum, a) => sum + sectionTargetWords(a.estimatedMinutes), 0);
    const maxTokens = Math.min(32768, Math.max(4096, Math.round(batchWords * 2)));

    const batchSections: ContentSection[] = [];

    try {
      const rawContent = await aiGenerate({ prompt: batchPrompt, maxTokens, temperature: 0.7 });
      const parsed = parseBatchResponse(rawContent, batch);

      for (const alloc of batch) {
        const section: ContentSection = {
          id: alloc.id,
          title: alloc.title,
          icon: alloc.icon,
          estimatedMinutes: alloc.estimatedMinutes,
          content: parsed[alloc.id] || 'Content not available.',
          completed: false,
        };
        allSections.push(section);
        batchSections.push(section);
        sectionIndex++;

        callbacks?.onStreamState({
          destination,
          country,
          topic: cleanTopic ?? undefined,
          totalSections: allocations.length,
          sectionTitles: allocations.map((a) => ({ id: a.id, title: a.title, icon: a.icon })),
          completedCount: sectionIndex,
          currentIndex: sectionIndex,
          currentTitle: alloc.title,
        });
      }
    } catch (batchErr) {
      const batchErrMsg = batchErr instanceof Error ? batchErr.message : 'Generation failed';
      callbacks?.onError?.(batchErrMsg);

      for (const alloc of batch) {
        const section: ContentSection = {
          id: alloc.id,
          title: alloc.title,
          icon: alloc.icon,
          estimatedMinutes: alloc.estimatedMinutes,
          content: `We couldn't generate content for this section: ${batchErrMsg}`,
          completed: false,
        };
        allSections.push(section);
        batchSections.push(section);
        sectionIndex++;
      }
    }

    // Push completed batch to generation manager (notifies content screen)
    updateSections(batchSections);

    // After first batch, signal the caller to navigate
    if (!firstBatchFired) {
      firstBatchFired = true;
      callbacks?.onFirstBatchReady?.();
    }
  }

  // Step 3: Await quiz (started concurrently with last batch, or generate now)
  let quizQuestions: QuizQuestion[] = [];
  if (!quizPromise && allSections.length >= 2) {
    // Single-batch case: generate quiz now
    try {
      const quizPrompt = cleanTopic
        ? buildTopicQuizPrompt(cleanTopic, allSections)
        : buildQuizPrompt(destination, country, allSections);
      const rawQuiz = await aiGenerate({ prompt: quizPrompt, maxTokens: 1500, temperature: 0.5 });
      const cleaned = extractJSON(rawQuiz);
      quizQuestions = JSON.parse(cleaned);
    } catch {
      // Quiz generation failed — continue without quiz
    }
  } else if (quizPromise) {
    try {
      quizQuestions = await quizPromise;
    } catch {
      // Quiz generation failed — continue without quiz
    }
  }

  setQuizQuestions(quizQuestions);
  finishGeneration();

  return {
    destination,
    country,
    flightDuration: flightDurationMinutes,
    totalReadingMinutes,
    sections: allSections,
    quizQuestions,
    topic: cleanTopic ?? undefined,
  };
}
