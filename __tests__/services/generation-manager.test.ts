import {
  initGeneration,
  updateSections,
  setQuizQuestions,
  finishGeneration,
  resetGeneration,
  subscribeToGeneration,
  isStillGenerating,
  getCurrentContent,
} from '../../src/services/generation-manager';

// Mock abortGeneration from ai-router (imported by generation-manager)
jest.mock('../../src/services/ai-router', () => ({
  abortGeneration: jest.fn(),
}));

const MOCK_ALLOCATIONS = [
  { id: 'overview', title: 'Overview', icon: 'globe', estimatedMinutes: 5 },
  { id: 'food', title: 'Food', icon: 'fork-knife', estimatedMinutes: 5 },
  { id: 'culture', title: 'Culture', icon: 'users', estimatedMinutes: 5 },
];

beforeEach(() => {
  resetGeneration();
});

describe('generation-manager', () => {
  describe('initGeneration', () => {
    it('sets generating to true and creates placeholder sections', () => {
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS);
      expect(isStillGenerating()).toBe(true);
      const content = getCurrentContent();
      expect(content).not.toBeNull();
      expect(content!.destination).toBe('Tokyo');
      expect(content!.country).toBe('Japan');
      expect(content!.sections).toHaveLength(3);
      expect(content!.sections[0].content).toBe('');
    });

    it('stores optional topic', () => {
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS, 'Sushi making');
      expect(getCurrentContent()!.topic).toBe('Sushi making');
    });
  });

  describe('updateSections', () => {
    it('replaces placeholder sections with completed ones', () => {
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS);

      updateSections([
        { id: 'overview', title: 'Overview', icon: 'globe', estimatedMinutes: 5, content: 'Rich content here', completed: false },
      ]);

      const content = getCurrentContent();
      expect(content!.sections[0].content).toBe('Rich content here');
      // Other sections still empty
      expect(content!.sections[1].content).toBe('');
    });

    it('does nothing before initGeneration', () => {
      updateSections([
        { id: 'overview', title: 'Overview', icon: 'globe', estimatedMinutes: 5, content: 'test', completed: false },
      ]);
      expect(getCurrentContent()).toBeNull();
    });
  });

  describe('subscribeToGeneration', () => {
    it('notifies listeners on section updates', () => {
      const listener = jest.fn();
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS);
      subscribeToGeneration(listener);

      updateSections([
        { id: 'food', title: 'Food', icon: 'fork-knife', estimatedMinutes: 5, content: 'Ramen is great', completed: false },
      ]);

      expect(listener).toHaveBeenCalled();
      const snapshot = listener.mock.calls[0][0];
      expect(snapshot.sections[1].content).toBe('Ramen is great');
    });

    it('returns an unsubscribe function', () => {
      const listener = jest.fn();
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS);
      const unsub = subscribeToGeneration(listener);
      unsub();

      updateSections([
        { id: 'food', title: 'Food', icon: 'fork-knife', estimatedMinutes: 5, content: 'Ramen', completed: false },
      ]);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('setQuizQuestions', () => {
    it('attaches quiz questions to content', () => {
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS);
      setQuizQuestions([
        { id: 1, question: 'What is sushi?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
      ]);
      expect(getCurrentContent()!.quizQuestions).toHaveLength(1);
    });

    it('does nothing before initGeneration', () => {
      setQuizQuestions([
        { id: 1, question: 'test', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
      ]);
      expect(getCurrentContent()).toBeNull();
    });
  });

  describe('finishGeneration', () => {
    it('marks generating as false', () => {
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS);
      expect(isStillGenerating()).toBe(true);
      finishGeneration();
      expect(isStillGenerating()).toBe(false);
    });
  });

  describe('resetGeneration', () => {
    it('clears all state and calls abortGeneration', () => {
      const { abortGeneration } = require('../../src/services/ai-router');
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS);
      resetGeneration();

      expect(getCurrentContent()).toBeNull();
      expect(isStillGenerating()).toBe(false);
      expect(abortGeneration).toHaveBeenCalled();
    });

    it('clears all listeners', () => {
      const listener = jest.fn();
      initGeneration('Tokyo', 'Japan', 120, 100, MOCK_ALLOCATIONS);
      subscribeToGeneration(listener);
      resetGeneration();

      // Re-init and update — old listener should not fire
      initGeneration('Paris', 'France', 60, 50, MOCK_ALLOCATIONS);
      updateSections([
        { id: 'overview', title: 'Overview', icon: 'globe', estimatedMinutes: 5, content: 'Bonjour', completed: false },
      ]);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
