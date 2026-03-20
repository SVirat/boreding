import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { initNetworkListener } from '../src/services/network';
import { initModelStatus } from '../src/services/offline-llm';
import { trackAppOpen } from '../src/services/analytics';
import ErrorBoundary from '../src/components/ErrorBoundary';

export default function RootLayout() {
  useEffect(() => {
    try {
      initNetworkListener();
    } catch {}
    try {
      initModelStatus();
    } catch {}
    try {
      trackAppOpen();
    } catch {}
  }, []);

  return (
    <ErrorBoundary screen="root">
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <StatusBar style="light" backgroundColor="#0f172a" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f172a' },
            animation: 'slide_from_right',
            animationTypeForReplace: 'push',
          }}
        />
      </View>
    </ErrorBoundary>
  );
}
