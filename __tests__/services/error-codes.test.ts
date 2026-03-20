import {
  getError,
  getErrorMessage,
  getFullErrorMessage,
  classifyError,
  ErrorCode,
} from '../../src/services/error-codes';

describe('error-codes', () => {
  describe('getError', () => {
    it('returns the correct entry for each known code', () => {
      const codes: ErrorCode[] = ['E100', 'E200', 'E300', 'E400', 'E500', 'E600', 'E700', 'W800', 'E999'];
      for (const code of codes) {
        const entry = getError(code);
        expect(entry).toBeDefined();
        expect(entry.code).toBe(code);
        expect(entry.message).toBeTruthy();
        expect(entry.recovery).toBeTruthy();
      }
    });
  });

  describe('getErrorMessage', () => {
    it('formats message with code', () => {
      const msg = getErrorMessage('E100');
      expect(msg).toContain('E100');
      expect(msg).toContain('Content generation failed');
    });
  });

  describe('getFullErrorMessage', () => {
    it('includes message, recovery, and code', () => {
      const msg = getFullErrorMessage('E200');
      expect(msg).toContain('Network error');
      expect(msg).toContain('check your internet');
      expect(msg).toContain('E200');
    });
  });

  describe('classifyError', () => {
    it('classifies network errors as E200', () => {
      expect(classifyError(new Error('network request failed'))).toBe('E200');
      expect(classifyError(new Error('fetch error'))).toBe('E200');
      expect(classifyError(new Error('ECONNREFUSED'))).toBe('E200');
    });

    it('classifies timeout errors as E103', () => {
      expect(classifyError(new Error('Request timed out'))).toBe('E103');
      expect(classifyError(new Error('Timeout'))).toBe('E103');
      expect(classifyError(new Error('aborted'))).toBe('E103');
    });

    it('classifies API key errors as E104', () => {
      expect(classifyError(new Error('Invalid API key'))).toBe('E104');
      expect(classifyError(new Error('401 Unauthorized'))).toBe('E104');
    });

    it('classifies OAuth errors as E300', () => {
      expect(classifyError(new Error('OAuth failed'))).toBe('E300');
      expect(classifyError(new Error('Sign-in error'))).toBe('E300');
    });

    it('classifies Gmail errors as E301', () => {
      expect(classifyError(new Error('Gmail scan failed'))).toBe('E301');
    });

    it('classifies payment errors as E400', () => {
      expect(classifyError(new Error('Payment failed'))).toBe('E400');
      expect(classifyError(new Error('Razorpay error'))).toBe('E400');
    });

    it('classifies JSON parse errors as E102', () => {
      expect(classifyError(new Error('JSON parse failed'))).toBe('E102');
    });

    it('classifies storage errors as E500', () => {
      expect(classifyError(new Error('AsyncStorage error'))).toBe('E500');
    });

    it('classifies model errors as E701', () => {
      expect(classifyError(new Error('Model inference failed'))).toBe('E701');
    });

    it('uses context-based fallbacks', () => {
      expect(classifyError(new Error('unknown'), 'generation')).toBe('E100');
      expect(classifyError(new Error('unknown'), 'auth')).toBe('E300');
      expect(classifyError(new Error('unknown'), 'payment')).toBe('E400');
      expect(classifyError(new Error('unknown'), 'content')).toBe('E600');
      expect(classifyError(new Error('unknown'), 'quiz')).toBe('E601');
      expect(classifyError(new Error('unknown'), 'share')).toBe('E602');
    });

    it('returns E999 for truly unknown errors', () => {
      expect(classifyError(new Error('unknown'))).toBe('E999');
    });

    it('handles non-Error inputs', () => {
      expect(classifyError('network issue')).toBe('E200');
      expect(classifyError(42)).toBe('E999');
    });
  });
});
