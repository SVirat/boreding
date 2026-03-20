// Offline analytics queue — stores events when offline; flushes when back online
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline, subscribeToNetwork } from './network';

const QUEUE_KEY = 'boreding_offline_analytics_queue';

interface QueuedEvent {
  action: string;
  params: Record<string, string | number | boolean>;
  timestamp: number;
}

// Callback set by analytics.ts so we don't create circular deps
let _flushSender: ((action: string, params: Record<string, string | number | boolean>, timestampMicros?: number) => void) | null = null;

export function setFlushSender(sender: (action: string, params: Record<string, string | number | boolean>, timestampMicros?: number) => void) {
  _flushSender = sender;
}

const MAX_QUEUE_SIZE = 500;

export async function enqueueEvent(action: string, params: Record<string, string | number | boolean>) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    let queue: QueuedEvent[] = raw ? JSON.parse(raw) : [];
    queue.push({ action, params, timestamp: Date.now() });
    // Cap queue size — drop oldest events if over limit
    if (queue.length > MAX_QUEUE_SIZE) {
      queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Never let analytics queue break the app
  }
}

export async function flushQueue() {
  if (!_flushSender || !isOnline()) return;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const queue: QueuedEvent[] = JSON.parse(raw);
    if (queue.length === 0) return;

    for (const event of queue) {
      // Send with original timestamp so GA4 records the correct event time
      const tsMicros = event.timestamp * 1000;
      _flushSender(event.action, event.params, tsMicros);
    }

    // Clear queue after sending
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // Silently fail — events remain queued for next attempt
  }
}

// Auto-flush when coming back online
export function initOfflineAnalytics() {
  subscribeToNetwork((connected) => {
    if (connected) {
      flushQueue();
    }
  });
}
