// ── Premium Token Configuration ──
// Edit these values to adjust how many tokens a payment grants.
// The Razorpay key is read from .env / app.config.js.

import Constants from 'expo-constants';

/** Razorpay Payment Page URL — kept for reference / legacy. */
export const RAZORPAY_PAYMENT_PAGE_URL: string =
  process.env.EXPO_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL ||
  Constants.expoConfig?.extra?.razorpayPaymentPageUrl ||
  '';

/** Razorpay Key ID for native SDK checkout. */
export const RAZORPAY_KEY_ID: string =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
  Constants.expoConfig?.extra?.razorpayKeyId ||
  '';

/**
 * Number of premium API tokens granted per purchase.
 * One 2-hour flight uses roughly 80K–100K tokens (input + output combined).
 * 500 000 tokens ≈ 5–6 full premium generations.
 */
export const TOKENS_PER_PURCHASE = 500_000;

/**
 * Suggested price in INR for the above token amount.
 * ₹99 ≈ $1.15 — covers cloud API cost for ~5 premium generations
 * with a healthy margin. Adjust in Razorpay dashboard to match.
 */
export const PRICE_INR = 99;
