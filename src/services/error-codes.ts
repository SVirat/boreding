// Centralized error code registry
// Every user-facing error has a unique code, friendly message, and recovery action.
// Error codes are tracked in GA4 telemetry via trackAppError().

export type ErrorCode =
  // Generation errors (E1xx)
  | 'E100' // AI generation failed (all providers)
  | 'E101' // Topic validation failed
  | 'E102' // Content parse failed
  | 'E103' // Generation timeout
  | 'E104' // No API key available
  // Network / connectivity (E2xx)
  | 'E200' // Network request failed
  | 'E201' // Offline with no local model
  // Auth errors (E3xx)
  | 'E300' // Google OAuth failed
  | 'E301' // Gmail scan failed
  | 'E302' // OAuth token expired
  // Payment errors (E4xx)
  | 'E400' // Payment processing failed
  | 'E401' // Payment verification failed
  // Storage errors (E5xx)
  | 'E500' // AsyncStorage read failed
  | 'E501' // AsyncStorage write failed
  | 'E502' // SecureStore failed
  // Rendering / screen errors (E6xx)
  | 'E600' // Content screen load failed
  | 'E601' // Quiz screen load failed
  | 'E602' // Share screen load failed
  | 'E603' // Component render crashed
  // Offline model errors (E7xx)
  | 'E700' // Model download failed
  | 'E701' // Model inference failed
  | 'E702' // Model file corrupt
  // Native module fallback warnings (W8xx)
  | 'W800' // expo-secure-store unavailable, fell back to AsyncStorage
  | 'W801' // @react-native-community/slider unavailable
  | 'W802' // Analytics initialization failed
  | 'W803' // expo-web-browser maybeCompleteAuthSession failed
  | 'W804' // Google Client ID resolution failed
  | 'W805' // expo-auth-session unavailable, OAuth disabled
  | 'W806' // expo-auth-session makeRedirectUri failed
  | 'W807' // llama.rn native module unavailable
  | 'W808' // NetInfo native module unavailable
  // Unknown (E9xx)
  | 'E999'; // Unexpected error

interface ErrorEntry {
  code: ErrorCode;
  message: string;
  recovery: string;
}

const ERROR_MAP: Record<ErrorCode, ErrorEntry> = {
  // Generation
  E100: { code: 'E100', message: 'Content generation failed', recovery: 'Please try again. If the problem persists, check your API key or internet connection.' },
  E101: { code: 'E101', message: 'Invalid topic', recovery: 'Please enter a valid learning topic and try again.' },
  E102: { code: 'E102', message: 'Failed to process generated content', recovery: 'Please try generating again.' },
  E103: { code: 'E103', message: 'Generation timed out', recovery: 'The AI is taking too long. Please try again or use a shorter content duration.' },
  E104: { code: 'E104', message: 'API key required', recovery: 'Please enter your Gemini or OpenAI API key to generate content.' },
  // Network
  E200: { code: 'E200', message: 'Network error', recovery: 'Please check your internet connection and try again.' },
  E201: { code: 'E201', message: 'You\'re offline', recovery: 'Download an offline AI model to generate content without internet.' },
  // Auth
  E300: { code: 'E300', message: 'Sign-in failed', recovery: 'Please try signing in again. Make sure popups are allowed.' },
  E301: { code: 'E301', message: 'Email scan failed', recovery: 'Could not scan your emails. Please try again or select your airports manually.' },
  E302: { code: 'E302', message: 'Session expired', recovery: 'Please sign in again to continue.' },
  // Payment
  E400: { code: 'E400', message: 'Payment failed', recovery: 'Your payment could not be processed. Please try again.' },
  E401: { code: 'E401', message: 'Payment verification failed', recovery: 'We couldn\'t verify your payment. Please contact support if you were charged.' },
  // Storage
  E500: { code: 'E500', message: 'Failed to load data', recovery: 'Please restart the app and try again.' },
  E501: { code: 'E501', message: 'Failed to save data', recovery: 'Please try again. Your device storage may be full.' },
  E502: { code: 'E502', message: 'Secure storage error', recovery: 'Please restart the app and try again.' },
  // Screen
  E600: { code: 'E600', message: 'Could not load content', recovery: 'Taking you back. Please try generating again.' },
  E601: { code: 'E601', message: 'Could not load quiz', recovery: 'Taking you back. Please try again.' },
  E602: { code: 'E602', message: 'Could not load results', recovery: 'Taking you back.' },
  E603: { code: 'E603', message: 'Something went wrong', recovery: 'An unexpected display error occurred. Taking you back.' },
  // Offline model
  E700: { code: 'E700', message: 'Model download failed', recovery: 'Please check your connection and try downloading again.' },
  E701: { code: 'E701', message: 'On-device AI failed', recovery: 'The local model couldn\'t generate content. Please try again or connect to the internet.' },
  E702: { code: 'E702', message: 'Model file is corrupted', recovery: 'Please delete and re-download the offline model.' },
  // Native module fallback warnings
  W800: { code: 'W800', message: 'Secure storage unavailable', recovery: 'Using fallback storage. Sensitive data may be less protected.' },
  W801: { code: 'W801', message: 'Slider component unavailable', recovery: 'Duration slider may not render.' },
  W802: { code: 'W802', message: 'Analytics initialization failed', recovery: 'Usage analytics are disabled for this session.' },
  W803: { code: 'W803', message: 'Auth session completion failed', recovery: 'OAuth callbacks may not complete automatically.' },
  W804: { code: 'W804', message: 'Google Client ID resolution failed', recovery: 'Gmail sign-in may be unavailable.' },
  W805: { code: 'W805', message: 'Auth session module unavailable', recovery: 'Native Google sign-in is disabled. Web sign-in still works.' },
  W806: { code: 'W806', message: 'Auth redirect URI failed', recovery: 'Native OAuth redirects unavailable.' },
  W807: { code: 'W807', message: 'Offline model engine unavailable', recovery: 'On-device AI is not available. Cloud generation still works.' },
  W808: { code: 'W808', message: 'Network state detection unavailable', recovery: 'App assumes online. Offline detection is disabled.' },
  // Unknown
  E999: { code: 'E999', message: 'Something went wrong', recovery: 'An unexpected error occurred. Please try again.' },
};

export function getError(code: ErrorCode): ErrorEntry {
  return ERROR_MAP[code];
}

export function getErrorMessage(code: ErrorCode): string {
  const entry = ERROR_MAP[code];
  return `${entry.message} (${code})`;
}

export function getFullErrorMessage(code: ErrorCode): string {
  const entry = ERROR_MAP[code];
  return `${entry.message}\n\n${entry.recovery}\n\nError code: ${code}`;
}

// Classify a raw error into an error code
export function classifyError(error: unknown, context?: string): ErrorCode {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('enotfound')) return 'E200';
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) return 'E103';
  if (msg.includes('api key') || msg.includes('apikey') || msg.includes('unauthorized') || msg.includes('401')) return 'E104';
  if (msg.includes('oauth') || msg.includes('sign-in') || msg.includes('sign in')) return 'E300';
  if (msg.includes('gmail') || msg.includes('email scan')) return 'E301';
  if (msg.includes('payment') || msg.includes('razorpay')) return 'E400';
  if (msg.includes('json') || msg.includes('parse')) return 'E102';
  if (msg.includes('storage') || msg.includes('asyncstorage')) return 'E500';
  if (msg.includes('secure') || msg.includes('keychain')) return 'E502';
  if (msg.includes('model') || msg.includes('llama') || msg.includes('inference')) return 'E701';
  if (msg.includes('download')) return 'E700';

  // Context-based fallbacks
  if (context === 'generation') return 'E100';
  if (context === 'auth') return 'E300';
  if (context === 'payment') return 'E400';
  if (context === 'content') return 'E600';
  if (context === 'quiz') return 'E601';
  if (context === 'share') return 'E602';

  return 'E999';
}
