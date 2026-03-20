/**
 * Google OAuth service for Boreding.
 *
 * Handles sign-in on all platforms:
 *   - Web:    Direct OAuth popup (no expo-auth-session quirks)
 *   - Native: expo-auth-session with deep-link redirect
 *
 * PUBLISHING CHECKLIST (do once):
 *   1. Go to Google Cloud Console → APIs & Services → Credentials
 *   2. Create TWO OAuth 2.0 Client IDs in the same project:
 *      a) "Web application" type:
 *         - Authorized JS origins: http://localhost:8081 (dev), https://yourdomain.com (prod)
 *         - Authorized redirect URIs: http://localhost:8081 (dev), https://yourdomain.com (prod)
 *      b) "Android" type:
 *         - Package name: com.boreding.app
 *         - SHA-1 from: eas credentials (run `eas credentials` to get it)
 *      c) (Optional) "iOS" type:
 *         - Bundle ID: com.boreding.app
 *   3. Put the WEB client ID in .env as GOOGLE_CLIENT_ID (used for both web and native implicit flow)
 *   4. Enable "Gmail API" in Google Cloud Console → APIs & Services → Library
 *   5. That's it. No code changes needed.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly email profile';

/** Resolve the Google Client ID from env / config (no user override needed here — that's in the UI). */
export function getBuiltinGoogleClientId(): string {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    Constants.expoConfig?.extra?.googleClientId ||
    ''
  );
}

/** Resolve the Android-specific Google Client ID (tied to SHA-1 + package name). */
export function getBuiltinGoogleAndroidClientId(): string {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    Constants.expoConfig?.extra?.googleAndroidClientId ||
    ''
  );
}

// ─────────────────────────────────────────────
// Web OAuth — simple popup, no library needed
// ─────────────────────────────────────────────

export function signInWithGoogleWeb(clientId: string): Promise<string | null> {
  if (Platform.OS !== 'web') {
    throw new Error('signInWithGoogleWeb() can only be called on web');
  }

  return new Promise((resolve) => {
    const redirectUri = window.location.origin;
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=consent`;

    const popup = window.open(url, '_blank', 'width=500,height=600');
    if (!popup) {
      resolve(null); // Popup blocked — caller should show message
      return;
    }

    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          resolve(null);
          return;
        }
        if (popup.location?.origin === window.location.origin) {
          const hash = popup.location.hash;
          popup.close();
          clearInterval(timer);
          const params = new URLSearchParams(hash.substring(1));
          resolve(params.get('access_token'));
        }
      } catch {
        // Cross-origin while popup is still on Google — keep polling
      }
    }, 500);
  });
}

// ─────────────────────────────────────────────
// Native OAuth — expo-auth-session (hook-based,
// used directly in the component via useGoogleAuth)
// ─────────────────────────────────────────────

// The native redirect URI for the 'boreding' scheme.
// On Android this becomes: boreding://  (handled by Expo's AuthSession activity)
export function getNativeRedirectUri(): string {
  // Dynamic import to avoid pulling expo-auth-session into the web bundle
  try {
    const AuthSession = require('expo-auth-session');
    return AuthSession.makeRedirectUri({ scheme: 'boreding' });
  } catch (e) {
    console.warn('[W806] expo-auth-session makeRedirectUri failed:', e instanceof Error ? e.message : e);
    return '';
  }
}

// ─────────────────────────────────────────────
// Token exchange: auth code → access token (PKCE)
// ─────────────────────────────────────────────

export async function exchangeGoogleAuthCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
    });
    if (codeVerifier) body.append('code_verifier', codeVerifier);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (res.ok) {
      const data = await res.json();
      return data.access_token ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Shared helper: fetch user profile after sign-in
// ─────────────────────────────────────────────

export async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.email ?? null;
    }
  } catch {}
  return null;
}
