module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  setupFiles: ['./__tests__/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-view-shot|@react-native-async-storage/async-storage|@react-native-community/netinfo|@react-native-community/slider|expo-router|expo-constants|expo-secure-store|expo-file-system|expo-web-browser|expo-linking|expo-sharing|expo-media-library|expo-auth-session|expo-linear-gradient|expo-status-bar|expo-modules-core|@google/generative-ai)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/types/**',
    '!src/theme/**',
  ],
};
