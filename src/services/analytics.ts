// Google Analytics 4 via Measurement Protocol
// Sends events to the same GA4 property as the web app, no native SDK required
// Queues events when offline and flushes them when connectivity is restored
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline } from './network';
import { enqueueEvent, setFlushSender, initOfflineAnalytics } from './offline-analytics';

const GA_MEASUREMENT_ID = process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID ?? '';
const GA_API_SECRET = process.env.EXPO_PUBLIC_GA_API_SECRET ?? '';
const GA_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;

const CLIENT_ID_KEY = 'boreding_ga_client_id';

type EventParams = Record<string, string | number | boolean | undefined>;

// Persistent client_id so GA4 recognises returning users
let _clientId: string | null = null;
async function getClientId(): Promise<string> {
  if (_clientId) return _clientId;
  const stored = await AsyncStorage.getItem(CLIENT_ID_KEY);
  if (stored) { _clientId = stored; return stored; }
  // Generate a simple UUID-like ID
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  await AsyncStorage.setItem(CLIENT_ID_KEY, id);
  _clientId = id;
  return id;
}

// Direct send (used for live sends and offline queue flush)
function sendDirect(action: string, params: Record<string, string | number | boolean>, timestampMicros?: number) {
  if (__DEV__ || !GA_MEASUREMENT_ID || !GA_API_SECRET) return;
  getClientId().then((clientId) => {
    const event: Record<string, any> = { name: action, params };
    if (timestampMicros) event.timestamp_micros = timestampMicros;
    fetch(GA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [event],
      }),
    }).catch(() => { /* swallow network errors silently */ });
  }).catch(() => {});
}

// Wire up the offline analytics flush sender and start listening
try {
  setFlushSender(sendDirect);
  initOfflineAnalytics();
} catch (e) {
  console.warn('[W802] Analytics initialization failed:', e instanceof Error ? e.message : e);
}

async function sendEvent(action: string, params?: EventParams) {
  if (__DEV__) {
    console.log(`[analytics] ${action}`, params);
  }
  if (!GA_MEASUREMENT_ID || !GA_API_SECRET) return;

  try {
    // Strip undefined values — GA4 rejects them
    const cleaned: Record<string, string | number | boolean> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) cleaned[k] = v;
      }
    }

    // Queue if offline; send immediately if online
    if (!isOnline()) {
      enqueueEvent(action, cleaned);
      return;
    }

    sendDirect(action, cleaned);
  } catch {
    // Never let analytics break the app
  }
}

// ── Button Clicks ──
export function trackButtonClick(buttonName: string, extra?: Record<string, string | number>) {
  sendEvent('button_click', { button_name: buttonName, ...extra });
}

// ── Route Pairings ──
export function trackRoutePairing(departureCode: string, arrivalCode: string, departureCity: string, arrivalCity: string) {
  sendEvent('route_pairing', {
    departure_code: departureCode,
    arrival_code: arrivalCode,
    departure_city: departureCity,
    arrival_city: arrivalCity,
    route: `${departureCode}-${arrivalCode}`,
  });
}

// ── Topic Selection ──
export function trackTopicSelected(topic: string) {
  sendEvent('topic_selected', { topic: topic.substring(0, 100) });
}

// ── Content Generation ──
export function trackGenerateStart(destination: string, durationMinutes: number, hasTopic: boolean, hasByok: boolean) {
  sendEvent('generate_start', {
    destination,
    duration_minutes: durationMinutes,
    has_custom_topic: hasTopic,
    has_byok: hasByok,
  });
}

export function trackGenerateComplete(destination: string, durationMinutes: number, loadTimeMs: number, sectionCount: number) {
  sendEvent('generate_complete', {
    destination,
    duration_minutes: durationMinutes,
    load_time_ms: loadTimeMs,
    section_count: sectionCount,
  });
}

export function trackGenerateError(destination: string, errorMessage: string) {
  sendEvent('generate_error', { destination, error_message: errorMessage.substring(0, 100) });
}

// ── Content Completion ──
export function trackSectionComplete(sectionIndex: number, sectionTitle: string, completedCount: number, totalSections: number) {
  sendEvent('section_complete', {
    section_index: sectionIndex,
    section_title: sectionTitle.substring(0, 100),
    completed_count: completedCount,
    total_sections: totalSections,
    completion_percent: Math.round((completedCount / totalSections) * 100),
  });
}

export function trackAllSectionsComplete(totalSections: number) {
  sendEvent('all_sections_complete', { total_sections: totalSections });
}

// ── Quiz ──
export function trackQuizAttempt(destination: string) {
  sendEvent('quiz_attempt', { destination });
}

export function trackQuizAnswer(questionIndex: number, isCorrect: boolean) {
  sendEvent('quiz_answer', { question_index: questionIndex, is_correct: isCorrect });
}

export function trackQuizComplete(score: number, total: number, destination: string) {
  const tier = score >= 4 ? 'expert' : score >= 3 ? 'well_prepared' : 'getting_there';
  sendEvent('quiz_complete', {
    quiz_score: score,
    quiz_total: total,
    quiz_percent: Math.round((score / total) * 100),
    performance_tier: tier,
    destination,
  });
}

// ── Share ──
export function trackShareClick(method: string, destination: string) {
  sendEvent('share_click', { share_method: method, destination });
}

export function trackRetakeQuiz(destination: string) {
  sendEvent('retake_quiz', { destination });
}

// ── Agent / Gmail ──
export function trackAgentClick(authStatus: string) {
  sendEvent('agent_click', { auth_status: authStatus });
}

export function trackAgentScanResult(success: boolean) {
  sendEvent('agent_scan_result', { scan_success: success });
}

// ── Upgrade ──
export function trackUpgradeClick() {
  sendEvent('upgrade_click');
}

// ── Offline Model ──
export function trackOfflineModelDownloadStart(modelId: string) {
  sendEvent('offline_model_download_start', { model_id: modelId });
}

export function trackOfflineModelDownloadComplete(modelId: string) {
  sendEvent('offline_model_download_complete', { model_id: modelId });
}

export function trackOfflineModelDownloadError(modelId: string, errorMessage: string) {
  sendEvent('offline_model_download_error', { model_id: modelId, error_message: errorMessage.substring(0, 100) });
}

export function trackOfflineModelDeleted(modelId: string) {
  sendEvent('offline_model_deleted', { model_id: modelId });
}

export function trackOfflineGeneration(destination: string, modelName: string) {
  sendEvent('offline_generation', { destination, model_name: modelName });
}

// ── Screen Views ──
export function trackScreenView(screenName: string) {
  sendEvent('screen_view', { screen_name: screenName });
}

// ── App Lifecycle ──
export function trackAppOpen() {
  sendEvent('app_open');
}

// ── Payment Success ──
export function trackPaymentSuccess(paymentId: string) {
  sendEvent('payment_success', { payment_id: paymentId.substring(0, 100) });
}

export function trackPaymentFailure(reason: string) {
  sendEvent('payment_failure', { reason: reason.substring(0, 100) });
}

export function trackPaymentCancelled() {
  sendEvent('payment_cancelled');
}

// ── App Errors (error code tracking) ──
export function trackAppError(errorCode: string, errorMessage: string, screen: string, rawError?: string) {
  sendEvent('app_error', {
    error_code: errorCode,
    error_message: errorMessage.substring(0, 100),
    screen,
    raw_error: rawError ? rawError.substring(0, 100) : '',
  });
}
