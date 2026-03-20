// On-device micro-LLM: model download manager + local inference via llama.rn
// Only supported on native (iOS/Android) — web falls back to cloud APIs
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Model registry ──

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  sizeLabel: string;
  url: string;
  filename: string;
  /** Minimum expected file size in bytes — used to detect corrupt/incomplete downloads */
  minExpectedBytes: number;
  promptTemplate: (prompt: string) => string;
}

const MODELS: ModelInfo[] = [
  {
    id: 'smollm2-360m',
    name: 'Lite',
    description: 'Smaller download, works on all devices.',
    sizeLabel: '~386 MB',
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
    filename: 'smollm2-360m-instruct-q8_0.gguf',
    minExpectedBytes: 200_000_000, // ~386 MB, anything under 200 MB is suspect
    promptTemplate: (prompt: string) =>
      `<|im_start|>system\nYou are a helpful, knowledgeable writer and educator.<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`,
  },
  {
    id: 'smollm2-1.7b',
    name: 'Standard',
    description: 'Better quality, recommended for most phones.',
    sizeLabel: '~1.06 GB',
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf',
    filename: 'smollm2-1.7b-instruct-q4_k_m.gguf',
    minExpectedBytes: 700_000_000, // ~1.06 GB, anything under 700 MB is suspect
    promptTemplate: (prompt: string) =>
      `<|im_start|>system\nYou are a helpful, knowledgeable writer and educator.<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`,
  },
];

// ── State management ──

const MODEL_STATUS_KEY = 'boreding_offline_model_status';
const NUDGE_DISMISSED_KEY = 'boreding_offline_nudge_dismissed';
const MODEL_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}models/` : '';

export type ModelStatus = 'not-downloaded' | 'downloading' | 'ready' | 'error';

export interface DownloadState {
  status: ModelStatus;
  progress: number;
  modelId: string;
  error?: string;
}

let _state: DownloadState = {
  status: 'not-downloaded',
  progress: 0,
  modelId: MODELS[0].id,
};

let _listeners: ((s: DownloadState) => void)[] = [];
let _downloadResumable: FileSystem.DownloadResumable | null = null;

function notify() {
  const snapshot = { ..._state };
  _listeners.forEach((l) => l(snapshot));
}

export function subscribeToModelState(listener: (s: DownloadState) => void): () => void {
  _listeners.push(listener);
  listener({ ..._state });
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

export function getDownloadState(): DownloadState {
  return { ..._state };
}

export function getAvailableModels(): ModelInfo[] {
  return [...MODELS];
}

export function isModelReady(): boolean {
  return _state.status === 'ready';
}

export function isOfflineLLMSupported(): boolean {
  return Platform.OS !== 'web';
}

// ── Restore persisted status on launch ──

export async function initModelStatus(): Promise<void> {
  if (!isOfflineLLMSupported()) return;
  try {
    const raw = await AsyncStorage.getItem(MODEL_STATUS_KEY);
    if (!raw) return;
    const persisted = JSON.parse(raw);
    if (persisted.status === 'ready' && persisted.modelId) {
      const model = MODELS.find((m) => m.id === persisted.modelId);
      if (model) {
        const info = await FileSystem.getInfoAsync(MODEL_DIR + model.filename);
        if (info.exists) {
          // Validate file size to catch previously corrupt downloads
          const fileSize = (info as any).size ?? 0;
          if (fileSize < model.minExpectedBytes) {
            console.warn(`[W812] Model file too small (${fileSize} bytes), removing corrupt download`);
            await FileSystem.deleteAsync(MODEL_DIR + model.filename, { idempotent: true }).catch(() => {});
            await AsyncStorage.removeItem(MODEL_STATUS_KEY);
          } else {
            _state = { status: 'ready', progress: 100, modelId: model.id };
          }
        } else {
          await AsyncStorage.removeItem(MODEL_STATUS_KEY);
        }
      }
    }
  } catch {
    // Ignore
  }
  notify();
}

// ── Download ──

export async function downloadModel(modelId?: string): Promise<void> {
  if (!isOfflineLLMSupported()) throw new Error('Offline models are only available on mobile devices.');

  const model = MODELS.find((m) => m.id === (modelId ?? MODELS[0].id));
  if (!model) throw new Error('Unknown model');

  _state = { status: 'downloading', progress: 0, modelId: model.id };
  notify();

  try {
    const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
    }

    const destPath = MODEL_DIR + model.filename;

    _downloadResumable = FileSystem.createDownloadResumable(
      model.url,
      destPath,
      {},
      (dp: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
        const pct = dp.totalBytesExpectedToWrite > 0
          ? Math.round((dp.totalBytesWritten / dp.totalBytesExpectedToWrite) * 100)
          : 0;
        _state = { status: 'downloading', progress: pct, modelId: model.id };
        notify();
      }
    );

    const result = await _downloadResumable.downloadAsync();
    _downloadResumable = null;

    if (!result) throw new Error('Download returned no result');

    // Validate HTTP status
    if (result.status && result.status !== 200) {
      await FileSystem.deleteAsync(destPath, { idempotent: true }).catch(() => {});
      throw new Error(`Download failed with HTTP status ${result.status}. The model URL may be unavailable.`);
    }

    // Validate file size — a fast download of a 230MB+ model is suspicious
    const fileInfo = await FileSystem.getInfoAsync(destPath);
    if (!fileInfo.exists) {
      throw new Error('Downloaded file is missing from disk.');
    }
    const fileSize = (fileInfo as any).size ?? 0;
    if (fileSize < model.minExpectedBytes) {
      await FileSystem.deleteAsync(destPath, { idempotent: true }).catch(() => {});
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Downloaded file is only ${sizeMB} MB — expected at least ${(model.minExpectedBytes / (1024 * 1024)).toFixed(0)} MB. ` +
        `The download may have failed or returned an error page. Please check your internet connection and try again.`
      );
    }

    _state = { status: 'ready', progress: 100, modelId: model.id };
    await AsyncStorage.setItem(MODEL_STATUS_KEY, JSON.stringify({ status: 'ready', modelId: model.id }));
    notify();
  } catch (err) {
    _downloadResumable = null;
    const msg = err instanceof Error ? err.message : 'Download failed';
    _state = { status: 'error', progress: 0, modelId: model.id, error: msg };
    notify();
    throw err;
  }
}

export async function cancelDownload(): Promise<void> {
  if (_downloadResumable) {
    try {
      await _downloadResumable.pauseAsync();
    } catch {
      // Ignore
    }
    _downloadResumable = null;
  }
  _state = { status: 'not-downloaded', progress: 0, modelId: _state.modelId };
  notify();
}

export async function deleteModel(): Promise<void> {
  await releaseModel();
  try {
    const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(MODEL_DIR, { idempotent: true });
    }
  } catch {
    // Ignore
  }
  await AsyncStorage.removeItem(MODEL_STATUS_KEY);
  _state = { status: 'not-downloaded', progress: 0, modelId: MODELS[0].id };
  notify();
}

// ── Inference via llama.rn ──

let _context: any = null; // LlamaContext from llama.rn

/** Quick check if the llama.rn native module is available in this build. */
export function isOfflineEngineAvailable(): boolean {
  try {
    require('llama.rn');
    return true;
  } catch {
    return false;
  }
}

async function getContext() {
  if (_context) return _context;

  const model = MODELS.find((m) => m.id === _state.modelId);
  if (!model) throw new Error('No model selected');
  const modelPath = MODEL_DIR + model.filename;

  const info = await FileSystem.getInfoAsync(modelPath);
  if (!info.exists) throw new Error('Model file not found. Please re-download.');

  // Dynamic require: llama.rn is optional — only loaded when needed on native
  let initLlama: any;
  try {
    initLlama = require('llama.rn').initLlama;
  } catch (e) {
    console.warn('[W807] llama.rn native module unavailable:', e instanceof Error ? e.message : e);
    throw new Error('Offline model engine is not available on this build. (W807)');
  }
  try {
    _context = await initLlama({
      model: modelPath,
      n_ctx: 2048,
      n_threads: 4,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[W809] initLlama failed — model file may be corrupt:', msg);
    // If the model file can't be loaded, it's likely corrupt — clean up
    _state = { status: 'error', progress: 0, modelId: _state.modelId, error: 'Model file appears corrupt. Please delete and re-download.' };
    await AsyncStorage.removeItem(MODEL_STATUS_KEY);
    notify();
    throw new Error('Failed to load offline model. The downloaded file may be corrupt — please delete it and download again. (W809)');
  }
  return _context;
}

export async function generateOffline(prompt: string, maxTokens: number): Promise<string> {
  if (!isModelReady()) throw new Error('Offline model not downloaded. Please download a model first.');

  const model = MODELS.find((m) => m.id === _state.modelId);
  if (!model) throw new Error('No model selected');

  const ctx = await getContext();
  let result: any;
  try {
    result = await ctx.completion({
      prompt: model.promptTemplate(prompt),
      n_predict: Math.min(maxTokens, 2048),
      temperature: 0.7,
      stop: ['<|im_end|>', '</s>', '<|end|>'],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[W810] Offline completion failed:', msg);
    throw new Error(`Offline model failed to generate: ${msg}. Try deleting and re-downloading the model. (W810)`);
  }

  const text = result?.text ?? '';
  if (!text.trim()) {
    console.warn('[W811] Offline model returned empty output');
    throw new Error('Offline model returned empty content. The model may be too small for this prompt, or the file may be corrupt. Try the Standard model or re-download. (W811)');
  }

  return text;
}

export async function releaseModel(): Promise<void> {
  if (_context) {
    try {
      await _context.release();
    } catch {
      // Ignore
    }
    _context = null;
  }
}

// ── Analytics helpers ──

export function getActiveModelName(): string {
  const model = MODELS.find((m) => m.id === _state.modelId);
  return model?.name ?? 'unknown';
}

// ── Nudge logic ──

/** Should we show the "download offline model" nudge? */
export async function shouldShowOfflineNudge(): Promise<boolean> {
  if (!isOfflineLLMSupported()) return false;
  if (isModelReady()) return false;
  if (_state.status === 'downloading') return false;
  try {
    const dismissed = await AsyncStorage.getItem(NUDGE_DISMISSED_KEY);
    return !dismissed;
  } catch {
    return false;
  }
}

/** User dismissed the nudge — don't show again */
export async function dismissOfflineNudge(): Promise<void> {
  await AsyncStorage.setItem(NUDGE_DISMISSED_KEY, Date.now().toString());
}
