import { isOnline, subscribeToNetwork } from '../../src/services/network';

describe('network', () => {
  describe('isOnline', () => {
    it('defaults to true', () => {
      expect(isOnline()).toBe(true);
    });
  });

  describe('subscribeToNetwork', () => {
    it('calls listener immediately with current state', () => {
      const listener = jest.fn();
      subscribeToNetwork(listener);
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('returns an unsubscribe function', () => {
      const listener = jest.fn();
      const unsub = subscribeToNetwork(listener);
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });
});
