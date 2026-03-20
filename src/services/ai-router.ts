import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSecure, setSecure, deleteSecure } from './secure-storage';
import Constants from 'expo-constants';
import { isOnline } from './network';
import { isModelReady, generateOffline, getActiveModelName } from './offline-llm';
import { isPremiumUser } from './payment';
import { hasPremiumTokens, deductTokens } from './token-balance';

export interface GenerateOptions {
  prompt: string;
  maxTokens: number;
  temperature?: number;
  timeout?: number;
}

// Abort controller for cancelling in-flight generation
let _activeAbort: AbortController | null = null;

/** Abort all in-flight AI requests. */
export function abortGeneration(): void {
  if (_activeAbort) {
    _activeAbort.abort();
    _activeAbort = null;
  }
}

const STORAGE_KEY_GEMINI = 'boreding_gemini_key';
const STORAGE_KEY_OPENAI = 'boreding_openai_key';

// Built-in keys: try process.env (web) then Constants.expoConfig.extra (native)
const BUILTIN_GEMINI_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  Constants.expoConfig?.extra?.geminiApiKey ||
  '';
const BUILTIN_OPENAI_KEY =
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  Constants.expoConfig?.extra?.openaiApiKey ||
  '';

// Premium-tier built-in keys (higher-quota keys for paid users)
const PREMIUM_GEMINI_KEY =
  process.env.EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY ||
  Constants.expoConfig?.extra?.premiumGeminiApiKey ||
  '';
const PREMIUM_OPENAI_KEY =
  process.env.EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY ||
  Constants.expoConfig?.extra?.premiumOpenaiApiKey ||
  '';

// Model tiers
const FREE_GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const PREMIUM_GEMINI_MODELS = ['gemini-2.5-pro'];
const FREE_OPENAI_MODEL = 'gpt-4o-mini';
const PREMIUM_OPENAI_MODEL = 'gpt-4o';

export async function getStoredApiKey(): Promise<string | null> {
  try {
    const gemini = await getSecure(STORAGE_KEY_GEMINI);
    if (gemini) return gemini;
    const openai = await getSecure(STORAGE_KEY_OPENAI);
    if (openai) return openai;
    // Fall back to built-in keys
    if (BUILTIN_GEMINI_KEY) return BUILTIN_GEMINI_KEY;
    if (BUILTIN_OPENAI_KEY) return BUILTIN_OPENAI_KEY;
    return null;
  } catch {
    return BUILTIN_GEMINI_KEY || BUILTIN_OPENAI_KEY || null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  const storageKey = key.startsWith('sk-') ? STORAGE_KEY_OPENAI : STORAGE_KEY_GEMINI;
  await setSecure(storageKey, key);
}

/** Validate that a user-provided API key works by making a minimal generation request. */
export async function validateApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  const provider = detectProvider(key);
  try {
    if (provider === 'openai') {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say hi' }],
            max_completion_tokens: 5,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const text = await response.text();
          if (response.status === 401) return { valid: false, error: 'Invalid API key. Please check and try again.' };
          if (response.status === 429) return { valid: true }; // rate-limited but key is valid
          return { valid: false, error: `OpenAI error ${response.status}: ${text.slice(0, 200)}` };
        }
        return { valid: true };
      } finally {
        clearTimeout(timer);
      }
    } else {
      const client = new GoogleGenerativeAI(key);
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Say hi' }] }],
        generationConfig: { maxOutputTokens: 5 },
      });
      return { valid: true };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('API key') || msg.includes('401') || msg.includes('PERMISSION_DENIED') || msg.includes('invalid')) {
      return { valid: false, error: 'Invalid API key. Please check and try again.' };
    }
    if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
      return { valid: true }; // rate-limited but key is valid
    }
    return { valid: false, error: msg.slice(0, 200) };
  }
}

export async function clearApiKeys(): Promise<void> {
  await deleteSecure(STORAGE_KEY_GEMINI);
  await deleteSecure(STORAGE_KEY_OPENAI);
}

function detectProvider(key: string): 'gemini' | 'openai' {
  if (key.startsWith('sk-')) return 'openai';
  return 'gemini';
}

async function generateWithGemini(apiKey: string, opts: GenerateOptions, models?: string[]): Promise<string> {
  const client = new GoogleGenerativeAI(apiKey);
  const modelList = models ?? FREE_GEMINI_MODELS;

  for (const modelName of modelList) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: 'You are a helpful, knowledgeable writer and educator. Follow the user\'s formatting instructions exactly.',
        });
        const timeout = opts.timeout ?? 120_000;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
            generationConfig: {
              maxOutputTokens: opts.maxTokens,
              temperature: opts.temperature ?? 0.7,
            },
          });
          return response.response.text() ?? '';
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = msg.includes('429') || msg.includes('rate') || msg.includes('quota')
          || msg.includes('500') || msg.includes('503') || msg.includes('overloaded');

        if (isTransient && attempt === 0) {
          // Retry once with backoff
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        if (isTransient && modelName !== modelList[modelList.length - 1]) {
          break; // Try next model
        }
        throw err;
      }
    }
  }
  throw new Error('Gemini: all models exhausted');
}

async function generateWithOpenAI(apiKey: string, opts: GenerateOptions, model?: string): Promise<string> {
  const timeout = opts.timeout ?? 120_000;
  const openaiModel = model ?? FREE_OPENAI_MODEL;
  // gpt-4o-mini supports max 16384 output tokens
  const maxTokens = openaiModel === 'gpt-4o-mini' ? Math.min(opts.maxTokens, 16384) : opts.maxTokens;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            { role: 'system', content: 'You are a helpful, knowledgeable writer and educator. Follow the user\'s formatting instructions exactly.' },
            { role: 'user', content: opts.prompt },
          ],
          max_completion_tokens: maxTokens,
          temperature: opts.temperature ?? 0.7,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        const isTransient = response.status === 429 || response.status === 500 || response.status === 503;
        if (isTransient && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw new Error(`OpenAI error ${response.status}: ${text}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('OpenAI: retries exhausted');
}

export async function aiGenerate(opts: GenerateOptions): Promise<string> {
  // Set up abort support — each aiGenerate call is cancellable via abortGeneration()
  _activeAbort = new AbortController();
  const signal = _activeAbort.signal;

  if (signal.aborted) throw new Error('Generation cancelled.');

  // When offline → use on-device model if available
  if (!isOnline()) {
    if (isModelReady()) {
      return generateOffline(opts.prompt, opts.maxTokens);
    }
    throw new Error(
      'You are offline and no local model is downloaded. Download an offline model from the home screen, or connect to the internet.'
    );
  }

  const premium = await isPremiumUser();
  // Only use premium models if the user still has tokens remaining
  const usePremiumModels = premium && await hasPremiumTokens();

  // Online path: User-provided keys (BYOK) take priority over built-in keys
  // Premium users get upgraded built-in keys (with higher quotas / better models)
  const byokGemini = await getSecure(STORAGE_KEY_GEMINI);
  const byokOpenai = await getSecure(STORAGE_KEY_OPENAI);

  const builtinGemini = usePremiumModels && PREMIUM_GEMINI_KEY ? PREMIUM_GEMINI_KEY : BUILTIN_GEMINI_KEY;
  const builtinOpenai = usePremiumModels && PREMIUM_OPENAI_KEY ? PREMIUM_OPENAI_KEY : BUILTIN_OPENAI_KEY;

  const geminiKey = byokGemini || builtinGemini;
  const openaiKey = byokOpenai || builtinOpenai;

  if (!geminiKey && !openaiKey) {
    throw new Error('No API key configured. Please add your Gemini or OpenAI API key in settings.');
  }

  // Select model tier based on premium status and token balance
  const geminiModels = usePremiumModels ? PREMIUM_GEMINI_MODELS : undefined;
  const openaiModel = usePremiumModels ? PREMIUM_OPENAI_MODEL : undefined;

  // Try Gemini first, then OpenAI as fallback
  const providers: { key: string; isByok: boolean; storageKey: string; gen: (k: string, o: GenerateOptions) => Promise<string> }[] = [];
  if (geminiKey) providers.push({ key: geminiKey, isByok: !!byokGemini, storageKey: STORAGE_KEY_GEMINI, gen: (k, o) => generateWithGemini(k, o, geminiModels) });
  if (openaiKey) providers.push({ key: openaiKey, isByok: !!byokOpenai, storageKey: STORAGE_KEY_OPENAI, gen: (k, o) => generateWithOpenAI(k, o, openaiModel) });

  const errors: string[] = [];

  for (const provider of providers) {
    if (signal.aborted) throw new Error('Generation cancelled.');
    try {
      const result = await provider.gen(provider.key, opts);
      // Deduct tokens from balance when using premium models
      if (usePremiumModels) {
        await deductTokens(opts.prompt.length, result.length).catch(() => {});
      }
      return result;
    } catch (err) {
      if (signal.aborted) throw new Error('Generation cancelled.');
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);

      // If a BYOK key caused an auth error, clear it so it doesn't persist
      if (provider.isByok) {
        const isAuthError = msg.includes('401') || msg.includes('PERMISSION_DENIED')
          || msg.includes('invalid') || msg.includes('API key');
        if (isAuthError) {
          await deleteSecure(provider.storageKey).catch(() => {});
        }
      }

      // If we lose connection mid-generation, try offline model
      if (!isOnline() && isModelReady()) {
        return generateOffline(opts.prompt, opts.maxTokens);
      }
    }
  }

  // Last resort: if an offline model is downloaded, use it even if we appear online
  // (cloud APIs may be failing due to bad keys, quota, or flaky network detection)
  if (isModelReady()) {
    return generateOffline(opts.prompt, opts.maxTokens);
  }

  throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
}
