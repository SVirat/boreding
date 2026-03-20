jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
  },
}));

jest.mock('../../src/services/secure-storage', () => {
  const store: Record<string, string> = {};
  return {
    getSecure: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setSecure: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteSecure: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    __store: store,
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const asyncStore: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(asyncStore[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        asyncStore[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete asyncStore[key];
        return Promise.resolve();
      }),
    },
    __asyncStore: asyncStore,
  };
});

const mockSecureStorage = require('../../src/services/secure-storage');
const mockAsyncStorage = require('@react-native-async-storage/async-storage');

import { isPremiumUser, markPremium, getStoredPaymentId } from '../../src/services/payment';
import { getTokenBalance, hasPremiumTokens, creditTokens, deductTokens } from '../../src/services/token-balance';

beforeEach(() => {
  Object.keys(mockSecureStorage.__store).forEach(
    (k) => delete mockSecureStorage.__store[k]
  );
  Object.keys(mockAsyncStorage.__asyncStore).forEach(
    (k) => delete mockAsyncStorage.__asyncStore[k]
  );
});

describe('payment', () => {
  describe('isPremiumUser', () => {
    it('returns false when no payment stored and no tokens', async () => {
      expect(await isPremiumUser()).toBe(false);
    });

    it('returns true after markPremium (which credits tokens)', async () => {
      await markPremium('pay_123');
      expect(await isPremiumUser()).toBe(true);
    });

    it('returns true with legacy paid flag even if no tokens', async () => {
      mockSecureStorage.__store['boreding_upgrade_paid'] = 'paid';
      expect(await isPremiumUser()).toBe(true);
    });
  });

  describe('markPremium', () => {
    it('stores paid status, payment ID, and credits tokens', async () => {
      await markPremium('pay_abc');
      expect(mockSecureStorage.setSecure).toHaveBeenCalledWith(
        'boreding_upgrade_paid',
        'paid'
      );
      expect(mockSecureStorage.setSecure).toHaveBeenCalledWith(
        'boreding_payment_id',
        'pay_abc'
      );
      // Should have credited tokens
      const balance = await getTokenBalance();
      expect(balance).toBeGreaterThan(0);
    });

    it('defaults paymentId to "rzp_native"', async () => {
      await markPremium();
      expect(mockSecureStorage.setSecure).toHaveBeenCalledWith(
        'boreding_payment_id',
        'rzp_native'
      );
    });
  });

  describe('getStoredPaymentId', () => {
    it('returns null when no payment stored', async () => {
      expect(await getStoredPaymentId()).toBeNull();
    });

    it('returns payment ID after markPremium', async () => {
      await markPremium('pay_xyz');
      expect(await getStoredPaymentId()).toBe('pay_xyz');
    });
  });
});

describe('token-balance', () => {
  describe('getTokenBalance', () => {
    it('returns 0 when no tokens credited', async () => {
      expect(await getTokenBalance()).toBe(0);
    });
  });

  describe('creditTokens', () => {
    it('credits default amount', async () => {
      const balance = await creditTokens();
      expect(balance).toBe(500_000); // TOKENS_PER_PURCHASE
    });

    it('stacks multiple purchases', async () => {
      await creditTokens();
      const balance = await creditTokens();
      expect(balance).toBe(1_000_000);
    });
  });

  describe('deductTokens', () => {
    it('deducts estimated tokens from balance', async () => {
      await creditTokens();
      const balance = await deductTokens(4000, 8000); // ~3000 tokens
      expect(balance).toBeLessThan(500_000);
      expect(balance).toBeGreaterThan(0);
    });

    it('floors at zero', async () => {
      await creditTokens(100);
      const balance = await deductTokens(4000, 8000);
      expect(balance).toBe(0);
    });
  });

  describe('hasPremiumTokens', () => {
    it('returns false when no tokens', async () => {
      expect(await hasPremiumTokens()).toBe(false);
    });

    it('returns true after crediting', async () => {
      await creditTokens();
      expect(await hasPremiumTokens()).toBe(true);
    });
  });
});
