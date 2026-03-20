// Razorpay Native SDK integration
// Uses react-native-razorpay to open the checkout UI inside the app.
// On success we get a direct JS callback with the payment ID — no redirects needed.
import RazorpayCheckout from 'react-native-razorpay';
import { getSecure, setSecure } from './secure-storage';
import { creditTokens, hasPremiumTokens } from './token-balance';
import { RAZORPAY_KEY_ID, PRICE_INR } from '../config/premium';
import { trackPaymentSuccess, trackPaymentFailure, trackPaymentCancelled } from './analytics';

const UPGRADE_STATUS_KEY = 'boreding_upgrade_paid';
const PAYMENT_ID_KEY = 'boreding_payment_id';

const log = (msg: string, data?: unknown) =>
  console.log(`[payment] ${msg}`, data !== undefined ? JSON.stringify(data, null, 2) : '');

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

/**
 * A user is "premium" if they have remaining premium tokens.
 * Falls back to the legacy paid flag for users who paid before the token system.
 */
export async function isPremiumUser(): Promise<boolean> {
  if (await hasPremiumTokens()) return true;
  const status = await getSecure(UPGRADE_STATUS_KEY);
  return status === 'paid';
}

export async function getStoredPaymentId(): Promise<string | null> {
  return getSecure(PAYMENT_ID_KEY);
}

export async function markPremium(paymentId: string = 'rzp_native'): Promise<void> {
  log('markPremium called', { paymentId });
  await setSecure(UPGRADE_STATUS_KEY, 'paid');
  await setSecure(PAYMENT_ID_KEY, paymentId);
  const newBalance = await creditTokens();
  log('markPremium done — stored paid status, paymentId, and credited tokens', { newBalance });
}

/**
 * Opens Razorpay native checkout inside the app.
 * Returns a PaymentResult with the payment ID on success.
 */
export async function openRazorpayCheckout(): Promise<PaymentResult> {
  log('openRazorpayCheckout called');

  if (!RAZORPAY_KEY_ID) {
    log('ERROR: No Razorpay key configured');
    return { success: false, error: 'Razorpay key is not configured.' };
  }

  try {
    const data = await RazorpayCheckout.open({
      key: RAZORPAY_KEY_ID,
      amount: PRICE_INR * 100, // amount in paise
      currency: 'INR',
      name: 'Boreding',
      description: 'Premium Upgrade — 500K tokens',
      theme: { color: '#F5A623' },
    });

    const paymentId = data.razorpay_payment_id;
    log('payment success', { paymentId });

    await markPremium(paymentId);
    trackPaymentSuccess(paymentId);
    return { success: true, paymentId };
  } catch (error: unknown) {
    // Razorpay SDK rejects with { code: number, description: string } on dismiss/failure
    const errObj = error as { code?: number; description?: string };
    const code = errObj?.code;
    const description = errObj?.description || (error instanceof Error ? error.message : String(error));

    if (code === 2) {
      // Code 2 = user dismissed the checkout
      log('user cancelled checkout');
      trackPaymentCancelled();
      return { success: false, error: 'cancelled' };
    }

    log('payment failed', { code, description });
    trackPaymentFailure(description);
    return { success: false, error: description };
  }
}
