// Global test setup — mock all native modules and external APIs

// ── AsyncStorage ──
const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    return Promise.resolve();
  }),
}));

// ── NetInfo ──
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// ── expo-constants ──
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      geminiApiKey: '',
      openaiApiKey: '',
      premiumGeminiApiKey: '',
      premiumOpenaiApiKey: '',
      googleClientId: '',
      razorpayPaymentPageUrl: 'https://test.rzp.io/test',
    },
  },
}));

// ── expo-secure-store ──
const secureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(secureStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    secureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete secureStore[key];
    return Promise.resolve();
  }),
}));

// ── expo-file-system ──
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(() => Promise.resolve({ uri: '/mock/file.gguf' })),
    pauseAsync: jest.fn(() => Promise.resolve()),
  })),
}));

// ── expo-web-browser ──
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

// ── expo-linking ──
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `boreding://${path}`),
  parse: jest.fn((url: string) => ({ queryParams: {} })),
}));

// ── expo-auth-session ──
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'boreding://'),
  useAutoDiscovery: jest.fn(() => null),
  useAuthRequest: jest.fn(() => [null, null, null]),
}));

// ── expo-sharing ──
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// ── expo-media-library ──
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
}));

// ── llama.rn ──
jest.mock('llama.rn', () => ({
  initLlama: jest.fn(() =>
    Promise.resolve({
      completion: jest.fn(() => Promise.resolve({ text: 'Mock offline response' })),
      release: jest.fn(() => Promise.resolve()),
    })
  ),
}));

// ── @google/generative-ai ──
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(() =>
        Promise.resolve({
          response: {
            text: () => 'Mock Gemini response',
          },
        })
      ),
    }),
  })),
}));

// ── react-native-view-shot ──
jest.mock('react-native-view-shot', () => 'ViewShot');

// ── react-native-svg ──
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Path: 'Path',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Stop: 'Stop',
  Rect: 'Rect',
  Ellipse: 'Ellipse',
}));

// ── expo-linear-gradient ──
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// ── react-native-reanimated ──
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// ── Global fetch mock ──
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as Response)
);

// ── Suppress console noise during tests ──
// Applied directly at setup time (setupFiles runs before the framework)
console.warn = jest.fn();
console.log = jest.fn();

// ── Helper to reset mock stores between tests ──
export function resetMockStores() {
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  Object.keys(secureStore).forEach((k) => delete secureStore[k]);
}

export { mockStore, secureStore };
