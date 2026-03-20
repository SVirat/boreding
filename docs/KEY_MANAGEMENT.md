# API Key Management Guide

**Boreding — In-Flight Learning App**

This document explains how to create, store, and safely deploy every API key used by Boreding. The app uses a **two-tier key system**: free-tier keys (for all users) and premium-tier keys (for paying users who get better AI models).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Inventory](#key-inventory)
3. [Creating Free-Tier Keys](#creating-free-tier-keys)
   - [Google Gemini (Free)](#google-gemini-free)
   - [OpenAI / ChatGPT (Free)](#openai--chatgpt-free)
4. [Creating Premium-Tier Keys](#creating-premium-tier-keys)
   - [Google Gemini (Premium)](#google-gemini-premium)
   - [OpenAI / ChatGPT (Premium)](#openai--chatgpt-premium)
   - [Anthropic Claude (Future)](#anthropic-claude-future)
5. [Local Development Setup](#local-development-setup)
6. [Production Build & EAS Secrets](#production-build--eas-secrets)
7. [How Keys Flow Through the App](#how-keys-flow-through-the-app)
8. [Model Tier Mapping](#model-tier-mapping)
9. [Security Best Practices](#security-best-practices)
10. [Quota & Budget Management](#quota--budget-management)
11. [Key Rotation](#key-rotation)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Build Time                           │
│                                                         │
│  .env file  ──►  app.config.js  ──►  JS Bundle          │
│                  (reads process.env)  (keys embedded)    │
│                                                         │
│  EAS Secrets ──►  (same flow on CI)                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Runtime                              │
│                                                         │
│  Built-in keys (from bundle)                            │
│       ▲                                                 │
│       │ fallback                                        │
│       │                                                 │
│  BYOK keys (user-provided, in secure storage)           │
│       ▲                                                 │
│       │ priority                                        │
│       │                                                 │
│  ai-router.ts  ──►  isPremiumUser()?                    │
│       │               ├── yes → premium keys + models   │
│       │               └── no  → free keys + models      │
│       ▼                                                 │
│  Gemini API / OpenAI API                                │
└─────────────────────────────────────────────────────────┘
```

**Key precedence** (highest to lowest):
1. User's own key (BYOK) stored in device secure storage
2. Built-in premium key (if user has paid)
3. Built-in free key (default)

---

## Key Inventory

| Environment Variable | Purpose | Tier | Required |
|---|---|---|---|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini API — free tier | Free | Yes (at least one AI key) |
| `EXPO_PUBLIC_OPENAI_API_KEY` | OpenAI API — free tier | Free | Fallback if no Gemini key |
| `EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY` | Google Gemini API — premium tier | Premium | Yes (for paid users) |
| `EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY` | OpenAI API — premium tier | Premium | Fallback for premium |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web client (Gmail agent) | Both | For Gmail scanning feature |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client (SHA-1) | Both | Required for Android Gmail scanning |
| `EXPO_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 | Both | For analytics |
| `EXPO_PUBLIC_GA_API_SECRET` | GA4 Measurement Protocol secret | Both | For analytics |
| `EXPO_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL` | Razorpay Payment Link URL | Both | For upgrade payments |\n| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Key ID for native SDK checkout | Both | For in-app payments |

---

## Creating Free-Tier Keys

### Google Gemini (Free)

These keys power the default experience using `gemini-2.5-flash-lite` (with `gemini-2.5-flash` as a fallback on rate limits).

1. **Go to** [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API key"**
4. Select an existing GCP project or create a new one (e.g. `boreding-free`)
5. Copy the generated key (starts with `AIzaSy...`)
6. **Set quotas** in the GCP Console:
   - Go to [APIs & Services → Enabled APIs](https://console.cloud.google.com/apis/dashboard)
   - Find **Generative Language API**
   - Click **Manage → Quotas**
   - Set a reasonable requests-per-minute limit (e.g. 60 RPM) to prevent abuse
   - Set a daily token limit to cap spend
7. **Enable billing alerts**:
   - Go to [Billing → Budgets & Alerts](https://console.cloud.google.com/billing/budgets)
   - Create a budget with email alerts at 50%, 80%, and 100% thresholds

**Resulting env var:**
```
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...your-free-key
```

### OpenAI / ChatGPT (Free)

These keys power the fallback using `gpt-4o-mini`.

1. **Go to** [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Navigate to **API keys** in the left sidebar
4. Click **"Create new secret key"**
5. Name it (e.g. `boreding-free-tier`)
6. Optionally assign it to a **Project** for isolation (recommended):
   - Go to **Settings → Organization → Projects**
   - Create a project (e.g. `Boreding Free`)
   - Generate the key under that project
7. Copy the key (starts with `sk-...`) — **you can only see it once**
8. **Set usage limits**:
   - Go to **Settings → Limits**
   - Set a monthly hard cap (e.g. $50) and a soft cap with email alerts
9. **Rate limits** are auto-assigned based on your usage tier. See [OpenAI rate limits docs](https://platform.openai.com/docs/guides/rate-limits)

**Resulting env var:**
```
EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-free-key
```

---

## Creating Premium-Tier Keys

Premium keys are used **only** when `isPremiumUser()` returns `true` (i.e. the user has completed a Razorpay payment). They access better, more expensive models.

> **Why separate keys?** Isolating free and premium keys into different GCP projects / OpenAI projects means:
> - Free-tier quota exhaustion never affects premium users
> - You can set different billing alerts and budget caps
> - You can track costs per tier independently

### Google Gemini (Premium)

Premium users get `gemini-2.5-pro`.

1. **Create a separate GCP project** (e.g. `boreding-premium`)
   - Go to [console.cloud.google.com](https://console.cloud.google.com) → **New Project**
2. **Enable the Generative Language API** in this project
3. **Create an API key** in [AI Studio](https://aistudio.google.com/apikey) scoped to the premium project
4. **Set higher quotas** (premium users deserve higher throughput):
   - 120+ RPM
   - Higher daily token budget
5. **Set billing alerts** at appropriate thresholds (premium revenue should cover these costs)

**Resulting env var:**
```
EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY=AIzaSy...your-premium-key
```

### OpenAI / ChatGPT (Premium)

Premium users get `gpt-4o` instead of `gpt-4o-mini`.

1. **Create a separate OpenAI project** (e.g. `Boreding Premium`)
   - Go to **Settings → Organization → Projects** on [platform.openai.com](https://platform.openai.com)
2. **Generate a key** under the premium project
3. **Set higher monthly limits**:
   - `gpt-4o` costs ~15× more than `gpt-4o-mini` per token — plan accordingly
   - Set hard cap based on expected premium user volume
4. **Monitor usage** via the [Usage dashboard](https://platform.openai.com/usage)

**Resulting env var:**
```
EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY=sk-...your-premium-key
```

### Anthropic Claude (Future)

Claude support is not yet integrated but is planned. When adding it:

1. **Go to** [Anthropic Console](https://console.anthropic.com/)
2. Create an account and add billing
3. Navigate to **API Keys** → **Create Key**
4. Create two keys (in separate Workspaces if you want isolation):
   - Free tier: for `claude-3-5-haiku` (fast, cheap)
   - Premium tier: for `claude-4-sonnet` or `claude-4-opus`
5. Set spend limits in **Settings → Plans & Billing → Usage Limits**

**Future env vars (not yet used):**
```
EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-...your-free-key
EXPO_PUBLIC_PREMIUM_CLAUDE_API_KEY=sk-ant-...your-premium-key
```

When implementing, you will need to:
- Add the env vars to `.env.example`, `app.config.js`, and `ai-router.ts`
- Add a `generateWithClaude()` function in `ai-router.ts` calling `https://api.anthropic.com/v1/messages`
- Add Claude to the provider fallback chain in `aiGenerate()`

---

## Local Development Setup

### Step 1: Create your `.env` file

```bash
cp .env.example .env
```

### Step 2: Fill in your keys

Open `.env` and paste your keys:

```env
# Free tier (required — at least one)
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
EXPO_PUBLIC_OPENAI_API_KEY=sk-...

# Premium tier (required for testing premium flow)
EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY=AIzaSy...
EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY=sk-...

# Google OAuth (for Gmail agent)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-xxxxxxxx.apps.googleusercontent.com

# Analytics & payments
EXPO_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
EXPO_PUBLIC_GA_API_SECRET=xxxxxxxxxxxxxxxx
EXPO_PUBLIC_RAZORPAY_PAYMENT_LINK=https://rzp.io/l/xxxxxxxx
```

### Step 3: Verify `.gitignore`

Confirm these lines exist in `.gitignore` (they already do):

```
.env
.env.local
.env.*.local
```

**Never commit `.env` to git.** Only `.env.example` (with empty values) is tracked.

### Step 4: Start the dev server

```bash
npx expo start
```

The keys are read by `app.config.js` via `require('dotenv').config()` and injected into:
- `process.env.EXPO_PUBLIC_*` (available in JS on web)
- `Constants.expoConfig.extra.*` (available in JS on native via `expo-constants`)

---

## Production Build & EAS Secrets

For production builds on EAS (Expo Application Services), keys can be provided via **either** of two methods:

### Method 1: `.env` file via `.easignore` (current setup)

The project has a `.easignore` file that intentionally **does not exclude** `.env` (unlike `.gitignore` which does). This means EAS cloud builds automatically include your `.env` file and all keys are available at build time.

This is the simplest approach — just keep your `.env` file up to date.

### Method 2: EAS Secrets (recommended for teams / CI)

For additional security or team setups, use EAS Secrets. These are injected as environment variables during the build and take precedence.

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Step 2: Create secrets for all keys

```bash
# Free-tier AI keys
eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_API_KEY --value "AIzaSy..."
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-..."

# Premium-tier AI keys
eas secret:create --scope project --name EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY --value "AIzaSy..."
eas secret:create --scope project --name EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY --value "sk-..."

# Google OAuth
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "123...apps.googleusercontent.com"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "123...-xxx.apps.googleusercontent.com"

# Analytics
eas secret:create --scope project --name EXPO_PUBLIC_GA_MEASUREMENT_ID --value "G-XXXXXXXXXX"
eas secret:create --scope project --name EXPO_PUBLIC_GA_API_SECRET --value "xxxxxxxx"

# Payment
eas secret:create --scope project --name EXPO_PUBLIC_RAZORPAY_PAYMENT_LINK --value "https://rzp.io/l/xxxxxxxx"
```

### Step 3: Verify secrets are set

```bash
eas secret:list
```

### Step 4: Build

```bash
# Preview (APK for testing)
eas build --profile preview --platform android

# Production
eas build --profile production --platform android
eas build --profile production --platform ios
```

EAS injects secrets as environment variables during the build. `app.config.js` reads them via `process.env`, and they end up in the JS bundle just like local development.

### Step 5: Update a secret (when rotating keys)

```bash
eas secret:delete --name EXPO_PUBLIC_GEMINI_API_KEY
eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_API_KEY --value "AIzaSy...new-key"
```

Then rebuild and submit.

---

## How Keys Flow Through the App

### At build time

```
.env / EAS Secrets
     │
     ▼
app.config.js (reads process.env)
     │
     ├── expo.extra.geminiApiKey
     ├── expo.extra.openaiApiKey
     ├── expo.extra.premiumGeminiApiKey
     └── expo.extra.premiumOpenaiApiKey
           │
           ▼
     JS Bundle (keys embedded as constants)
```

### At runtime (`ai-router.ts`)

```
aiGenerate() called
     │
     ├── Offline? → use on-device model (no key needed)
     │
     ├── Check isPremiumUser()
     │     ├── true  → select PREMIUM built-in keys + premium model names
     │     └── false → select FREE built-in keys + free model names
     │
     ├── Check BYOK (user's own key in secure storage)
     │     └── BYOK key takes priority over built-in key
     │
     └── Call provider: Gemini first, OpenAI as fallback
```

### User-provided keys (BYOK)

Users can optionally enter their own API key in the home screen. These are stored in:
- **iOS/Android**: `expo-secure-store` (hardware-backed keychain)
- **Web**: `AsyncStorage` (localStorage)

Storage keys:
- `boreding_gemini_key` — user's Gemini key
- `boreding_openai_key` — user's OpenAI key

BYOK keys **always** take priority over built-in keys, but the **model tier** (free vs premium) is still determined by payment status.

---

## Model Tier Mapping

| Provider | Free Tier | Premium Tier |
|---|---|---|
| **Gemini** | `gemini-2.5-flash-lite` → `gemini-2.5-flash` (fallback on 429) | `gemini-2.5-pro` |
| **OpenAI** | `gpt-4o-mini` | `gpt-4o` |
| **Claude** *(future)* | `claude-3-5-haiku` | `claude-4-sonnet` |

### Cost comparison (approximate, as of early 2026)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| `gemini-2.5-flash-lite` | ~$0.075 | ~$0.30 |
| `gemini-2.5-flash` | ~$0.15 | ~$0.60 |
| `gemini-2.5-pro` | ~$1.25 | ~$10.00 |
| `gpt-4o-mini` | ~$0.15 | ~$0.60 |
| `gpt-4o` | ~$2.50 | ~$10.00 |

A typical content generation session produces ~5,000–15,000 tokens. Budget accordingly.

---

## Security Best Practices

### What we already do

- **`.env` is in `.gitignore`** — keys never enter version control
- **EAS Secrets for production** — keys are injected at build time, not stored in the repo
- **Secure storage on device** — BYOK keys use `expo-secure-store` (iOS Keychain / Android Keystore) on native
- **Separate free/premium keys** — quota isolation, independent cost tracking
- **No backend server** — keys go directly from app to AI provider; no intermediary to breach

### Inherent limitations (and mitigations)

| Risk | Explanation | Mitigation |
|---|---|---|
| Keys in JS bundle | `EXPO_PUBLIC_*` keys are embedded in the JavaScript bundle at build time. A determined attacker can extract them by decompiling the app. | Set strict per-key quotas and budget caps. Monitor usage dashboards for anomalies. Use separate projects so a leaked free key doesn't affect premium. |
| No server-side validation | Without a backend, you cannot verify payment server-side before granting premium keys. | The premium key is still embedded in the bundle. Payment status is checked client-side. This is acceptable for the current app scale. |
| Web fallback uses localStorage | On web, `AsyncStorage` uses `localStorage`, which is not encrypted. | This is a known Expo limitation. Sensitive operations should prefer native apps where `expo-secure-store` provides hardware encryption. |

### Recommended additional hardening

1. **Set per-key quotas aggressively** — A leaked key with a $5/day cap limits damage
2. **Monitor usage dashboards weekly** — Sudden spikes indicate a leaked key
3. **Rotate keys quarterly** — See [Key Rotation](#key-rotation)
4. **Enable GCP alerting** — Set up Cloud Monitoring alerts for unusual API traffic patterns
5. **Use restricted API keys in GCP** — Restrict key to only the Generative Language API:
   - GCP Console → APIs & Services → Credentials → Edit key → API restrictions → "Restrict key" → Select only "Generative Language API"
6. **Consider a proxy backend (future)** — For maximum security, route all AI calls through your own server so keys never ship in the client bundle. This eliminates the extraction risk entirely.

---

## Quota & Budget Management

### Google Cloud (Gemini)

| Setting | Free Project | Premium Project |
|---|---|---|
| Requests per minute | 60 | 120+ |
| Tokens per day | 1,000,000 | 5,000,000 |
| Budget alert (monthly) | $20 | $200 |
| Hard budget cap | $30 | $300 |

Set these at:
- **Quotas**: [GCP Console → APIs & Services → Quotas](https://console.cloud.google.com/apis/quotas)
- **Budgets**: [GCP Console → Billing → Budgets & Alerts](https://console.cloud.google.com/billing/budgets)

### OpenAI

| Setting | Free Project | Premium Project |
|---|---|---|
| Monthly hard limit | $50 | $500 |
| Monthly soft limit (email alert) | $30 | $300 |
| RPM (auto-assigned by tier) | ~500 | ~500 |

Set these at:
- **Limits**: [platform.openai.com → Settings → Limits](https://platform.openai.com/account/limits)
- **Usage**: [platform.openai.com → Usage](https://platform.openai.com/usage)

### Anthropic Claude (future)

| Setting | Free Workspace | Premium Workspace |
|---|---|---|
| Monthly spend limit | $50 | $500 |
| RPM | Default tier | Default tier |

Set these at:
- [console.anthropic.com → Settings → Usage Limits](https://console.anthropic.com/settings/limits)

---

## Key Rotation

Rotate keys periodically (at minimum quarterly, or immediately if you suspect a leak).

### Rotation procedure

1. **Generate a new key** in the provider's dashboard (do NOT delete the old key yet)
2. **Update locally**:
   ```bash
   # Edit .env with the new key
   ```
3. **Update EAS Secrets**:
   ```bash
   eas secret:delete --name EXPO_PUBLIC_GEMINI_API_KEY
   eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_API_KEY --value "AIzaSy...new-key"
   ```
4. **Rebuild and submit** the app to stores:
   ```bash
   eas build --profile production --platform all
   eas submit --platform all
   ```
5. **Wait for rollout** — Once most users have updated, delete the old key in the provider dashboard
6. **Grace period** — Keep the old key active for 2–4 weeks after publishing the update to cover users who haven't updated yet

### Emergency rotation (suspected leak)

1. **Immediately** set the compromised key's quota to 0 in the provider dashboard
2. Generate a new key
3. Update EAS secrets + rebuild + submit as above
4. Delete the compromised key once the new build is live

---

## Troubleshooting

### "No API key configured" error

- Check that `.env` has at least one of `EXPO_PUBLIC_GEMINI_API_KEY` or `EXPO_PUBLIC_OPENAI_API_KEY` set
- Restart the dev server after editing `.env` (`npx expo start --clear`)
- For production builds, verify with `eas secret:list`

### "Gemini: all models exhausted" / 429 errors

- Your free-tier Gemini key has hit its quota
- Increase limits in GCP Console → Quotas
- Or ensure `EXPO_PUBLIC_OPENAI_API_KEY` is set as a fallback

### Premium users still getting free-tier models

- Verify the payment flow works: check `boreding_upgrade_paid` is `'paid'` in secure storage
- Ensure `EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY` and/or `EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY` are set
- If these env vars are empty, the router falls back to free-tier keys and models automatically

### Keys work locally but not in production

- Ensure EAS Secrets are created with the `EXPO_PUBLIC_` prefix (Expo only exposes env vars with this prefix to the JS bundle)
- Rebuild after updating secrets — secrets are injected at build time, not runtime

### Testing premium flow locally

To simulate a premium user in development without making a real payment:

```javascript
// In your browser/device console or a temporary test file:
import { markPremium } from './src/services/payment';
await markPremium('test_payment_id');
```

This sets the premium flag in local secure storage. To revert:

```javascript
import { deleteSecure } from './src/services/secure-storage';
await deleteSecure('boreding_upgrade_paid');
await deleteSecure('boreding_payment_id');
```

---

## Quick Reference: Complete `.env` File

```env
# ─── Free-Tier AI Keys ───
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
EXPO_PUBLIC_OPENAI_API_KEY=sk-...

# ─── Premium-Tier AI Keys ───
EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY=AIzaSy...
EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY=sk-...

# ─── Google OAuth ───
EXPO_PUBLIC_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com

# ─── Analytics ───
EXPO_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
EXPO_PUBLIC_GA_API_SECRET=xxxxxxxxxxxxxxxx

# ─── Payments ───
EXPO_PUBLIC_RAZORPAY_PAYMENT_LINK=https://rzp.io/l/xxxxxxxx
```

---

Questions? Contact [svirat@gmail.com](mailto:svirat@gmail.com)

© 2026 Boreding. All rights reserved.
