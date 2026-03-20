import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueueEvent,
  flushQueue,
  setFlushSender,
  initOfflineAnalytics,
} from '../../src/services/offline-analytics';

// We need to mock network state
jest.mock('../../src/services/network', () => {
  let _connected = true;
  const _listeners: ((c: boolean) => void)[] = [];
  return {
    isOnline: jest.fn(() => _connected),
    subscribeToNetwork: jest.fn((listener: (c: boolean) => void) => {
      _listeners.push(listener);
      listener(_connected);
      return () => {
        const idx = _listeners.indexOf(listener);
        if (idx >= 0) _listeners.splice(idx, 1);
      };
    }),
    __setConnected: (v: boolean) => {
      _connected = v;
      _listeners.forEach((l) => l(v));
    },
  };
});

const mockNetwork = require('../../src/services/network');

beforeEach(async () => {
  await AsyncStorage.clear();
  mockNetwork.__setConnected(true);
});

describe('offline-analytics', () => {
  describe('enqueueEvent', () => {
    it('stores events in AsyncStorage', async () => {
      await enqueueEvent('test_action', { key: 'value' });
      const raw = await AsyncStorage.getItem('boreding_offline_analytics_queue');
      expect(raw).toBeTruthy();
      const queue = JSON.parse(raw!);
      expect(queue).toHaveLength(1);
      expect(queue[0].action).toBe('test_action');
      expect(queue[0].params.key).toBe('value');
      expect(queue[0].timestamp).toBeGreaterThan(0);
    });

    it('appends to existing queue', async () => {
      await enqueueEvent('event1', { a: 1 });
      await enqueueEvent('event2', { b: 2 });
      const raw = await AsyncStorage.getItem('boreding_offline_analytics_queue');
      const queue = JSON.parse(raw!);
      expect(queue).toHaveLength(2);
    });

    it('caps queue size at 500', async () => {
      // Pre-fill with 500 events
      const events = Array.from({ length: 500 }, (_, i) => ({
        action: `event_${i}`,
        params: {},
        timestamp: Date.now(),
      }));
      await AsyncStorage.setItem(
        'boreding_offline_analytics_queue',
        JSON.stringify(events)
      );

      await enqueueEvent('overflow_event', {});
      const raw = await AsyncStorage.getItem('boreding_offline_analytics_queue');
      const queue = JSON.parse(raw!);
      expect(queue).toHaveLength(500);
      // Oldest should be dropped, newest should be last
      expect(queue[queue.length - 1].action).toBe('overflow_event');
    });
  });

  describe('flushQueue', () => {
    it('sends all queued events and clears queue', async () => {
      const sender = jest.fn();
      setFlushSender(sender);
      mockNetwork.__setConnected(true);

      await enqueueEvent('ev1', { x: 1 });
      await enqueueEvent('ev2', { y: 2 });
      await flushQueue();

      expect(sender).toHaveBeenCalledTimes(2);
      expect(sender).toHaveBeenCalledWith('ev1', { x: 1 }, expect.any(Number));
      expect(sender).toHaveBeenCalledWith('ev2', { y: 2 }, expect.any(Number));

      const raw = await AsyncStorage.getItem('boreding_offline_analytics_queue');
      expect(raw).toBeNull();
    });

    it('does not flush when offline', async () => {
      const sender = jest.fn();
      setFlushSender(sender);
      mockNetwork.__setConnected(false);

      await enqueueEvent('ev1', { x: 1 });
      await flushQueue();

      expect(sender).not.toHaveBeenCalled();
      // Queue should still exist
      const raw = await AsyncStorage.getItem('boreding_offline_analytics_queue');
      expect(raw).toBeTruthy();
    });

    it('does not flush without a sender', async () => {
      setFlushSender(null as any);
      await enqueueEvent('ev1', { x: 1 });
      // Should not throw
      await flushQueue();
    });

    it('does nothing if queue is empty', async () => {
      const sender = jest.fn();
      setFlushSender(sender);
      await flushQueue();
      expect(sender).not.toHaveBeenCalled();
    });
  });
});
