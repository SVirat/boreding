// Network state detection with listener support
import { Platform } from 'react-native';

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  console.warn('[W808] NetInfo unavailable:', e instanceof Error ? e.message : e);
}

let _isConnected = true;
let _listeners: ((connected: boolean) => void)[] = [];

function notify() {
  _listeners.forEach((l) => l(_isConnected));
}

export function isOnline(): boolean {
  return _isConnected;
}

export function subscribeToNetwork(listener: (connected: boolean) => void): () => void {
  _listeners.push(listener);
  listener(_isConnected);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

export function initNetworkListener() {
  if (Platform.OS === 'web') {
    _isConnected = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        _isConnected = true;
        notify();
      });
      window.addEventListener('offline', () => {
        _isConnected = false;
        notify();
      });
    }
  } else if (NetInfo) {
    NetInfo.addEventListener((state: any) => {
      const wasConnected = _isConnected;
      _isConnected = state.isConnected ?? true;
      if (wasConnected !== _isConnected) notify();
    });
  }
}
