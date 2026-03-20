import { GoogleGenerativeAI } from '@google/generative-ai';

// Local mock for generative AI so we can control it per-test
const mockGenerateContent = jest.fn(() =>
  Promise.resolve({ response: { text: () => 'Gemini mock response' } })
);
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// We need to control mocks precisely for these tests
jest.mock('../../src/services/secure-storage', () => {
  const store: Record<string, string> = {};
  return {
    getSecure: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setSecure: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteSecure: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    __store: store,
  };
});

jest.mock('../../src/services/network', () => ({
  isOnline: jest.fn(() => true),
}));

jest.mock('../../src/services/offline-llm', () => ({
  isModelReady: jest.fn(() => false),
  generateOffline: jest.fn(() => Promise.resolve('Offline response')),
  getActiveModelName: jest.fn(() => 'test-model'),
}));

jest.mock('../../src/services/payment', () => ({
  isPremiumUser: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('../../src/services/token-balance', () => ({
  hasPremiumTokens: jest.fn(() => Promise.resolve(false)),
  deductTokens: jest.fn(() => Promise.resolve(0)),
}));

const mockNetwork = require('../../src/services/network');
const mockOfflineLlm = require('../../src/services/offline-llm');
const mockPayment = require('../../src/services/payment');
const mockTokenBalance = require('../../src/services/token-balance');
const mockSecureStorage = require('../../src/services/secure-storage');

import {
  aiGenerate,
  getStoredApiKey,
  saveApiKey,
  clearApiKeys,
  abortGeneration,
} from '../../src/services/ai-router';

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockSecureStorage.__store).forEach(
    (k) => delete mockSecureStorage.__store[k]
  );
  mockNetwork.isOnline.mockReturnValue(true);
  mockOfflineLlm.isModelReady.mockReturnValue(false);
  mockPayment.isPremiumUser.mockResolvedValue(false);
  mockTokenBalance.hasPremiumTokens.mockResolvedValue(false);
  mockTokenBalance.deductTokens.mockResolvedValue(0);

  // Reset the Gemini mock to return a valid response
  mockGenerateContent.mockImplementation(() =>
    Promise.resolve({ response: { text: () => 'Gemini mock response' } })
  );
  (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  }));

  // Reset fetch mock for OpenAI
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content: 'OpenAI mock response' } }],
      }),
    text: () => Promise.resolve(''),
  });
});

describe('ai-router', () => {
  describe('saveApiKey / getStoredApiKey / clearApiKeys', () => {
    it('saves OpenAI key when starts with sk-', async () => {
      await saveApiKey('sk-test123');
      expect(mockSecureStorage.setSecure).toHaveBeenCalledWith(
        'boreding_openai_key',
        'sk-test123'
      );
    });

    it('saves Gemini key for other keys', async () => {
      await saveApiKey('AIzaSyTest');
      expect(mockSecureStorage.setSecure).toHaveBeenCalledWith(
        'boreding_gemini_key',
        'AIzaSyTest'
      );
    });

    it('getStoredApiKey returns BYOK keys first', async () => {
      await saveApiKey('AIzaSyMyKey');
      const key = await getStoredApiKey();
      expect(key).toBe('AIzaSyMyKey');
    });

    it('clearApiKeys removes all stored keys', async () => {
      await saveApiKey('sk-test');
      await clearApiKeys();
      expect(mockSecureStorage.deleteSecure).toHaveBeenCalledWith('boreding_gemini_key');
      expect(mockSecureStorage.deleteSecure).toHaveBeenCalledWith('boreding_openai_key');
    });
  });

  describe('aiGenerate — offline path', () => {
    it('uses offline model when offline and model ready', async () => {
      mockNetwork.isOnline.mockReturnValue(false);
      mockOfflineLlm.isModelReady.mockReturnValue(true);

      const result = await aiGenerate({ prompt: 'test', maxTokens: 100 });
      expect(result).toBe('Offline response');
      expect(mockOfflineLlm.generateOffline).toHaveBeenCalledWith('test', 100);
    });

    it('throws when offline and no model', async () => {
      mockNetwork.isOnline.mockReturnValue(false);
      mockOfflineLlm.isModelReady.mockReturnValue(false);

      await expect(aiGenerate({ prompt: 'test', maxTokens: 100 })).rejects.toThrow(
        'offline'
      );
    });
  });

  describe('aiGenerate — online path', () => {
    it('throws when no API keys available', async () => {
      // No BYOK keys, no built-in keys (they're empty from Constants mock)
      await expect(
        aiGenerate({ prompt: 'test', maxTokens: 100 })
      ).rejects.toThrow('No API key configured');
    });

    it('uses Gemini when BYOK Gemini key is set', async () => {
      await saveApiKey('AIzaSyTest');

      const result = await aiGenerate({ prompt: 'Hello', maxTokens: 100 });
      expect(result).toBe('Gemini mock response');
      expect(GoogleGenerativeAI).toHaveBeenCalledWith('AIzaSyTest');
    });

    it('uses OpenAI when BYOK OpenAI key is set', async () => {
      await saveApiKey('sk-testing');

      const result = await aiGenerate({ prompt: 'Hello', maxTokens: 100 });
      expect(result).toBe('OpenAI mock response');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-testing',
          }),
        })
      );
    });

    it('falls back to OpenAI when Gemini fails', async () => {
      await saveApiKey('AIzaSyTest');
      await saveApiKey('sk-fallback');

      // Make Gemini throw
      mockGenerateContent.mockImplementation(() => Promise.reject(new Error('Gemini error')));

      const result = await aiGenerate({ prompt: 'Hello', maxTokens: 100 });
      expect(result).toBe('OpenAI mock response');
    });

    it('throws when all providers fail', async () => {
      await saveApiKey('AIzaSyTest');

      mockGenerateContent.mockImplementation(() => Promise.reject(new Error('fail')));

      await expect(
        aiGenerate({ prompt: 'Hello', maxTokens: 100 })
      ).rejects.toThrow('All AI providers failed');
    });

    it('falls back to offline when connection drops mid-generation', async () => {
      await saveApiKey('AIzaSyTest');

      // First isOnline check returns true, Gemini fails, second check returns false
      let callCount = 0;
      mockNetwork.isOnline.mockImplementation(() => {
        callCount++;
        return callCount <= 1; // true for first call, false after
      });
      mockOfflineLlm.isModelReady.mockReturnValue(true);

      mockGenerateContent.mockImplementation(() => Promise.reject(new Error('Network lost')));

      const result = await aiGenerate({ prompt: 'Hello', maxTokens: 100 });
      expect(result).toBe('Offline response');
    });
  });

  describe('abortGeneration', () => {
    it('can be called without error when no generation active', () => {
      expect(() => abortGeneration()).not.toThrow();
    });
  });

  describe('aiGenerate — OpenAI retry on transient error', () => {
    it('retries once on 429 then succeeds', async () => {
      await saveApiKey('sk-retry');

      let attempt = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            text: () => Promise.resolve('Rate limited'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: 'Retry success' } }],
            }),
          text: () => Promise.resolve(''),
        });
      });

      const result = await aiGenerate({ prompt: 'test', maxTokens: 100, timeout: 5000 });
      expect(result).toBe('Retry success');
      expect(attempt).toBe(2);
    });
  });
});
