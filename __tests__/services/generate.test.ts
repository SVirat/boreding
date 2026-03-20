/**
 * Tests for generate.ts — the content generation pipeline.
 * All AI calls are mocked to avoid real API usage.
 */

jest.mock('../../src/services/ai-router', () => ({
  aiGenerate: jest.fn(),
  abortGeneration: jest.fn(),
}));

jest.mock('../../src/services/generation-manager', () => ({
  initGeneration: jest.fn(),
  updateSections: jest.fn(),
  setQuizQuestions: jest.fn(),
  finishGeneration: jest.fn(),
  resetGeneration: jest.fn(),
}));

const mockAiRouter = require('../../src/services/ai-router');
const mockGenManager = require('../../src/services/generation-manager');

import { generateContent } from '../../src/services/generate';

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper: Build a mock batch response with correct delimiters
function mockBatchResponse(sections: { id: string; content: string }[]): string {
  return sections
    .map((s) => `---SECTION: ${s.id}---\n${s.content}`)
    .join('\n\n');
}

describe('generate', () => {
  describe('generateContent — destination mode', () => {
    it('generates sections in batches and returns full content', async () => {
      // Mock AI responses for batches
      let batchCall = 0;
      mockAiRouter.aiGenerate.mockImplementation(async (opts: any) => {
        if (opts.prompt.includes('quiz')) {
          return JSON.stringify([
            { id: 1, question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
          ]);
        }
        batchCall++;
        // Return batch with section delimiters
        return mockBatchResponse([
          { id: 'overview', content: 'Overview content here.' },
          { id: 'culture', content: 'Culture content here.' },
          { id: 'food', content: 'Food content here.' },
          { id: 'attractions', content: 'Attractions content here.' },
        ]);
      });

      const result = await generateContent('Tokyo', 'Japan', 30);

      expect(result.destination).toBe('Tokyo');
      expect(result.country).toBe('Japan');
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.sections[0].content).toBeTruthy();
      expect(result.sections[0].content).not.toBe('');
      expect(mockGenManager.initGeneration).toHaveBeenCalled();
      expect(mockGenManager.finishGeneration).toHaveBeenCalled();
    });

    it('calls callbacks during generation', async () => {
      mockAiRouter.aiGenerate.mockResolvedValue(
        mockBatchResponse([
          { id: 'overview', content: 'Content' },
          { id: 'culture', content: 'Content' },
          { id: 'food', content: 'Content' },
          { id: 'attractions', content: 'Content' },
        ])
      );

      const onStreamState = jest.fn();
      const onFirstBatchReady = jest.fn();

      await generateContent('Paris', 'France', 20, undefined, {
        onStreamState,
        onError: jest.fn(),
        onFirstBatchReady,
      });

      expect(onStreamState).toHaveBeenCalled();
      expect(onFirstBatchReady).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateContent — topic mode', () => {
    it('validates topic before generating', async () => {
      let callIndex = 0;
      mockAiRouter.aiGenerate.mockImplementation(async (opts: any) => {
        callIndex++;
        if (callIndex === 1) {
          // Topic validation
          return '{"valid": true, "topic": "Machine Learning"}';
        }
        if (callIndex === 2) {
          // Section titles
          return JSON.stringify([
            { id: 'section-1', title: 'Introduction' },
            { id: 'section-2', title: 'Deep Dive' },
            { id: 'section-3', title: 'Applications' },
            { id: 'section-4', title: 'Future' },
          ]);
        }
        if (opts.prompt.includes('quiz')) {
          return '[]';
        }
        // Batch content
        return mockBatchResponse([
          { id: 'section-1', content: 'Intro content' },
          { id: 'section-2', content: 'Deep dive content' },
          { id: 'section-3', content: 'Applications content' },
          { id: 'section-4', content: 'Future content' },
        ]);
      });

      const result = await generateContent('Tokyo', 'Japan', 30, 'Machine Learning');
      expect(result.topic).toBe('Machine Learning');
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('rejects invalid topics', async () => {
      // When reason is omitted, the code uses the default message containing "doesn't seem"
      mockAiRouter.aiGenerate.mockResolvedValueOnce(
        '{"valid": false}'
      );

      await expect(
        generateContent('Tokyo', 'Japan', 30, 'asdfghjk')
      ).rejects.toThrow("doesn't seem");
    });

    it('proceeds if topic validation fails to parse', async () => {
      let callIndex = 0;
      mockAiRouter.aiGenerate.mockImplementation(async () => {
        callIndex++;
        if (callIndex === 1) return 'not valid json at all';
        if (callIndex === 2) {
          return JSON.stringify([
            { id: 'section-1', title: 'Part 1' },
            { id: 'section-2', title: 'Part 2' },
            { id: 'section-3', title: 'Part 3' },
            { id: 'section-4', title: 'Part 4' },
          ]);
        }
        return mockBatchResponse([
          { id: 'section-1', content: 'Content 1' },
          { id: 'section-2', content: 'Content 2' },
          { id: 'section-3', content: 'Content 3' },
          { id: 'section-4', content: 'Content 4' },
        ]);
      });

      // Should not throw — validation parse failure is treated as "proceed"
      const result = await generateContent('Tokyo', 'Japan', 30, 'Good topic');
      expect(result.sections.length).toBeGreaterThan(0);
    });
  });

  describe('generateContent — batch failure resilience', () => {
    it('uses placeholder content when a batch fails', async () => {
      mockAiRouter.aiGenerate.mockRejectedValue(new Error('API error'));

      const result = await generateContent('Tokyo', 'Japan', 20);
      // Should not throw — batch errors are caught
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.sections[0].content).toContain("couldn't generate");
    });
  });

  describe('generateContent — JSON response parsing (extractJSON)', () => {
    it('handles JSON wrapped in markdown code fences', async () => {
      let callIndex = 0;
      mockAiRouter.aiGenerate.mockImplementation(async () => {
        callIndex++;
        if (callIndex === 1) {
          return '```json\n{"valid": true, "topic": "Test"}\n```';
        }
        if (callIndex === 2) {
          return '```\n[{"id": "section-1", "title": "Part 1"}, {"id": "section-2", "title": "Part 2"}, {"id": "section-3", "title": "Part 3"}, {"id": "section-4", "title": "Part 4"}]\n```';
        }
        return mockBatchResponse([
          { id: 'section-1', content: 'C1' },
          { id: 'section-2', content: 'C2' },
          { id: 'section-3', content: 'C3' },
          { id: 'section-4', content: 'C4' },
        ]);
      });

      const result = await generateContent('Tokyo', 'Japan', 30, 'Test');
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('handles JSON with surrounding text', async () => {
      let callIndex = 0;
      mockAiRouter.aiGenerate.mockImplementation(async () => {
        callIndex++;
        if (callIndex === 1) {
          return 'Here is the validation: {"valid": true, "topic": "Physics"} -- done';
        }
        if (callIndex === 2) {
          return 'The sections are: [{"id": "section-1", "title": "Intro"}, {"id": "section-2", "title": "Laws"}, {"id": "section-3", "title": "Quantum"}, {"id": "section-4", "title": "Relativity"}]';
        }
        return mockBatchResponse([
          { id: 'section-1', content: 'Content' },
          { id: 'section-2', content: 'Content' },
          { id: 'section-3', content: 'Content' },
          { id: 'section-4', content: 'Content' },
        ]);
      });

      const result = await generateContent('X', 'Y', 30, 'Physics');
      expect(result.sections.length).toBeGreaterThan(0);
    });
  });

  describe('generateContent — quiz generation', () => {
    it('includes quiz questions in result', async () => {
      mockAiRouter.aiGenerate.mockImplementation(async (opts: any) => {
        if (opts.prompt.includes('quiz')) {
          return JSON.stringify([
            { id: 1, question: 'What is...?', options: ['A', 'B', 'C', 'D'], correctIndex: 2 },
            { id: 2, question: 'Where is...?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
          ]);
        }
        return mockBatchResponse([
          { id: 'overview', content: 'Overview text' },
          { id: 'culture', content: 'Culture text' },
          { id: 'food', content: 'Food text' },
          { id: 'attractions', content: 'Attractions text' },
        ]);
      });

      const result = await generateContent('London', 'UK', 25);
      expect(result.quizQuestions).toBeDefined();
      expect(result.quizQuestions!.length).toBeGreaterThan(0);
      expect(result.quizQuestions![0].options).toHaveLength(4);
    });

    it('returns empty quiz when quiz generation fails', async () => {
      mockAiRouter.aiGenerate.mockImplementation(async (opts: any) => {
        if (opts.prompt.includes('quiz')) {
          throw new Error('Quiz API failed');
        }
        return mockBatchResponse([
          { id: 'overview', content: 'Content' },
          { id: 'culture', content: 'Content' },
          { id: 'food', content: 'Content' },
          { id: 'attractions', content: 'Content' },
        ]);
      });

      const result = await generateContent('London', 'UK', 25);
      expect(result.quizQuestions).toEqual([]);
    });
  });
});
