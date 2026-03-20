try { require('dotenv').config(); } catch (_) {}

module.exports = {
  expo: {
    name: 'Boreding',
    slug: 'boreding',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.jpg',
    scheme: 'boreding',
    userInterfaceStyle: 'dark',
    newArchEnabled: false,
    splash: {
      image: './assets/icon.jpg',
      resizeMode: 'contain',
      backgroundColor: '#0f172a',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0f172a',
      },
      package: 'com.boreding.app',
      versionCode: 10,
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.boreding.app',
    },
    plugins: [
      'expo-router',
      'expo-asset',
      'expo-web-browser',
      'expo-secure-store',
      [
        'expo-media-library',
        {
          photosPermission: 'Allow Boreding to save your results card to your photo library.',
          savePhotosPermission: 'Allow Boreding to save your results card to your photo library.',
        },
      ],
    ],
    extra: {
      geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
      premiumGeminiApiKey: process.env.EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY || process.env.PREMIUM_GEMINI_API_KEY || '',
      premiumOpenaiApiKey: process.env.EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY || process.env.PREMIUM_OPENAI_API_KEY || '',
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.GOOGLE_ANDROID_CLIENT_ID || '',
      razorpayPaymentPageUrl: process.env.EXPO_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL || '',
      razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
      router: {
        origin: false,
      },
      eas: {
        projectId: '76756853-809f-43ad-9006-cd2d7f73e5ad',
      },
    },
  },
};
