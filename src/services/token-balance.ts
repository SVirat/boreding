// Premium token balance: tracks how many API tokens remain from purchase
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKENS_PER_PURCHASE } from '../config/premium';

const TOKEN_BALANCE_KEY = 'boreding_premium_token_balance';

/**
 * Get the current premium token balance.
 * Returns 0 if no tokens have been purchased.
 */
export async function getTokenBalance(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_BALANCE_KEY);
    if (!raw) return 0;
    const val = parseInt(raw, 10);
    return isNaN(val) ? 0 : Math.max(0, val);
  } catch {
    return 0;
  }
}

/**
 * Credit tokens after a successful purchase.
 * Adds to the existing balance (supports multiple purchases).
 */
export async function creditTokens(amount: number = TOKENS_PER_PURCHASE): Promise<number> {
  const current = await getTokenBalance();
  const newBalance = current + amount;
  await AsyncStorage.setItem(TOKEN_BALANCE_KEY, String(newBalance));
  return newBalance;
}

/**
 * Deduct tokens after an AI generation call.
 * Estimates token usage from the prompt and response lengths.
 * Returns the new balance (floored at 0).
 */
export async function deductTokens(promptLength: number, responseLength: number): Promise<number> {
  // Rough estimate: 1 token ≈ 4 characters for English text
  const estimatedTokens = Math.ceil((promptLength + responseLength) / 4);
  const current = await getTokenBalance();
  const newBalance = Math.max(0, current - estimatedTokens);
  await AsyncStorage.setItem(TOKEN_BALANCE_KEY, String(newBalance));
  return newBalance;
}

/**
 * Check if the user has premium tokens remaining.
 */
export async function hasPremiumTokens(): Promise<boolean> {
  return (await getTokenBalance()) > 0;
}
