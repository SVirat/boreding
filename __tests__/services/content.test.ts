import {
  buildSectionAllocations,
  sectionTargetWords,
  buildBatchPrompt,
  buildQuizPrompt,
  buildTopicValidationPrompt,
  buildTopicSectionsPrompt,
  buildTopicBatchPrompt,
  buildTopicQuizPrompt,
  buildTopicAllocations,
  getSectionCount,
} from '../../src/lib/content';

describe('content', () => {
  describe('getSectionCount', () => {
    it('returns 4 for short flights (<30 min)', () => {
      expect(getSectionCount(15)).toBe(4);
      expect(getSectionCount(29)).toBe(4);
    });

    it('returns 8 for medium flights (30-89 min)', () => {
      expect(getSectionCount(30)).toBe(8);
      expect(getSectionCount(89)).toBe(8);
    });

    it('returns 12 for long flights (90-239 min)', () => {
      expect(getSectionCount(90)).toBe(12);
      expect(getSectionCount(239)).toBe(12);
    });

    it('returns 16 for very long flights (240+ min)', () => {
      expect(getSectionCount(240)).toBe(16);
      expect(getSectionCount(600)).toBe(16);
    });
  });

  describe('buildSectionAllocations', () => {
    it('returns 4 sections for short flights', () => {
      const allocs = buildSectionAllocations(20);
      expect(allocs.length).toBe(4);
    });

    it('returns more sections for longer flights', () => {
      const short = buildSectionAllocations(20);
      const long = buildSectionAllocations(120);
      expect(long.length).toBeGreaterThan(short.length);
    });

    it('each allocation has required fields', () => {
      const allocs = buildSectionAllocations(60);
      for (const a of allocs) {
        expect(a.id).toBeTruthy();
        expect(a.title).toBeTruthy();
        expect(a.icon).toBeTruthy();
        expect(a.estimatedMinutes).toBeGreaterThanOrEqual(3);
        expect(a.estimatedMinutes).toBeLessThanOrEqual(12);
      }
    });

    it('all allocations have unique IDs', () => {
      const allocs = buildSectionAllocations(180);
      const ids = allocs.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('sectionTargetWords', () => {
    it('clamps to minimum of 400 words', () => {
      expect(sectionTargetWords(1)).toBe(400);
    });

    it('clamps to maximum of 2500 words', () => {
      expect(sectionTargetWords(20)).toBe(2500);
    });

    it('calculates ~200 words per minute within bounds', () => {
      expect(sectionTargetWords(5)).toBe(1000);
      expect(sectionTargetWords(10)).toBe(2000);
    });
  });

  describe('buildBatchPrompt', () => {
    it('includes destination and country', () => {
      const prompt = buildBatchPrompt('Tokyo', 'Japan', [
        { id: 'overview', title: 'Overview', icon: 'globe', estimatedMinutes: 5 },
      ]);
      expect(prompt).toContain('Tokyo');
      expect(prompt).toContain('Japan');
    });

    it('includes section IDs and titles', () => {
      const allocs = [
        { id: 'food', title: 'Food & Cuisine', icon: 'fork-knife', estimatedMinutes: 5 },
        { id: 'culture', title: 'Culture', icon: 'users', estimatedMinutes: 5 },
      ];
      const prompt = buildBatchPrompt('Paris', 'France', allocs);
      expect(prompt).toContain('food');
      expect(prompt).toContain('Food & Cuisine');
      expect(prompt).toContain('culture');
      expect(prompt).toContain('---SECTION:');
    });

    it('specifies the section count', () => {
      const allocs = [
        { id: 'a', title: 'A', icon: 'globe', estimatedMinutes: 5 },
        { id: 'b', title: 'B', icon: 'globe', estimatedMinutes: 5 },
        { id: 'c', title: 'C', icon: 'globe', estimatedMinutes: 5 },
      ];
      const prompt = buildBatchPrompt('London', 'UK', allocs);
      expect(prompt).toContain('3 sections');
    });
  });

  describe('buildQuizPrompt', () => {
    it('includes destination and content summaries', () => {
      const sections = [
        { id: '1', title: 'Overview', icon: 'globe', estimatedMinutes: 5, content: 'Some content about Tokyo', completed: false },
      ];
      const prompt = buildQuizPrompt('Tokyo', 'Japan', sections);
      expect(prompt).toContain('Tokyo');
      expect(prompt).toContain('Japan');
      expect(prompt).toContain('Some content about Tokyo');
      expect(prompt).toContain('5 multiple-choice');
    });
  });

  describe('buildTopicValidationPrompt', () => {
    it('includes the topic', () => {
      const prompt = buildTopicValidationPrompt('Machine Learning');
      expect(prompt).toContain('Machine Learning');
      expect(prompt).toContain('valid');
    });
  });

  describe('buildTopicSectionsPrompt', () => {
    it('includes topic and section count', () => {
      const prompt = buildTopicSectionsPrompt('Quantum Physics', 6);
      expect(prompt).toContain('Quantum Physics');
      expect(prompt).toContain('6');
    });
  });

  describe('buildTopicBatchPrompt', () => {
    it('includes topic and section details', () => {
      const allocs = [
        { id: 'section-1', title: 'Intro', icon: 'globe', estimatedMinutes: 5 },
      ];
      const prompt = buildTopicBatchPrompt('Guitar basics', allocs);
      expect(prompt).toContain('Guitar basics');
      expect(prompt).toContain('section-1');
      expect(prompt).toContain('---SECTION:');
    });
  });

  describe('buildTopicQuizPrompt', () => {
    it('includes topic and content summaries', () => {
      const sections = [
        { id: '1', title: 'Part 1', icon: 'globe', estimatedMinutes: 5, content: 'Content about guitars', completed: false },
      ];
      const prompt = buildTopicQuizPrompt('Guitar basics', sections);
      expect(prompt).toContain('Guitar basics');
      expect(prompt).toContain('Content about guitars');
    });
  });

  describe('buildTopicAllocations', () => {
    it('assigns icons cyclically and clamps minutes', () => {
      const titles = [
        { id: 'section-1', title: 'Intro' },
        { id: 'section-2', title: 'Deep Dive' },
      ];
      const allocs = buildTopicAllocations(60, titles);
      expect(allocs).toHaveLength(2);
      expect(allocs[0].icon).toBeTruthy();
      expect(allocs[0].estimatedMinutes).toBeGreaterThanOrEqual(3);
      expect(allocs[0].estimatedMinutes).toBeLessThanOrEqual(12);
    });

    it('distributes time evenly', () => {
      const titles = Array.from({ length: 4 }, (_, i) => ({
        id: `s-${i}`,
        title: `Section ${i}`,
      }));
      const allocs = buildTopicAllocations(40, titles);
      // 40 / 4 = 10 min each
      expect(allocs[0].estimatedMinutes).toBe(10);
    });
  });
});
