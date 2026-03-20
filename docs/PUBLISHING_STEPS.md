# Boreding — Learn on the Fly ✈️

A React Native (Expo) mobile app that transforms flight time into valuable learning through AI-generated, personalized content — online or offline.

## Features

- **AI Content Generation** — Gemini (primary) + OpenAI (fallback) + on-device LLM (offline) generate sections matched to your flight duration
- **Progressive Loading** — First batch of sections loads instantly; remaining sections generate in the background while you read
- **Rich Markdown Rendering** — Content displayed with proper bold, italic, headings, bullet lists, and inline callouts
- **Sticky Section Headers** — Floating header with scroll progress percentage and animated progress bar while reading
- **Offline LLM Support** — Download SmolLM2 (230 MB) or TinyLlama (670 MB) from Hugging Face for content generation without internet
- **500+ Airport Database** — Search-as-you-type airport picker with automatic flight duration estimation
- **Gmail AI Agent** — Auto-detect upcoming flights from booking confirmation emails via Google OAuth
- **Custom Learning Topics** — Learn about your destination or any topic (ML, Guitar, etc.) with AI-validated topics
- **Interactive Quiz** — 5 AI-generated questions with scoring tiers, generated concurrently with content
- **Social Sharing** — Share results to Instagram, Twitter/X, WhatsApp with screenshot cards
- **Premium Upgrade** — Razorpay payment with deep-link callback for better AI models
- **BYOK** — Bring Your Own API Key (Gemini or OpenAI), stored securely on-device
- **GA4 Analytics** — Event tracking via Measurement Protocol with offline event queue
- **Network Awareness** — Real-time online/offline detection with graceful fallback
- **Dark Theme** — Full dark UI with animated gradient accents

## Project Structure

```
boreding/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout (dark theme, network & model init)
│   ├── index.tsx               # Home (airport picker, agent, generate, offline model, upgrade)
│   ├── content.tsx             # Content reader (sticky headers, sections, markdown, progress)
│   ├── quiz.tsx                # 5-question multiple-choice quiz
│   ├── share.tsx               # Results card & social sharing
│   └── payment-success.tsx     # Razorpay deep-link callback
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── AirportPicker.tsx   # Search-as-you-type airport selector
│   │   ├── AirplaneSvg.tsx     # Custom airplane SVG icon with animated flight path
│   │   ├── AnimatedGradientBorder.tsx  # Rainbow gradient border
│   │   ├── CrossPlatformSlider.tsx     # Native + web slider
│   │   ├── ErrorBoundary.tsx           # React error boundary with error codes & recovery UI
│   │   ├── GeneratingScreen.tsx        # Loading screen with flight facts & section checklist
│   │   ├── OfflineModelCard.tsx        # Offline LLM download/manage UI
│   │   └── SectionCard.tsx     # Expandable content section with scroll-based completion
│   ├── services/               # Business logic & APIs
│   │   ├── ai-router.ts        # Gemini → OpenAI → offline LLM fallback + BYOK
│   │   ├── airports.ts         # 500+ airport database & Haversine duration calc
│   │   ├── analytics.ts        # GA4 Measurement Protocol with offline queue + error telemetry
│   │   ├── error-codes.ts      # Centralized error code registry (E1xx–E9xx)
│   │   ├── generate.ts         # Batched parallel content generation orchestrator
│   │   ├── generation-manager.ts # Pub/sub real-time content state management
│   │   ├── gmail-agent.ts      # Gmail OAuth + flight email scanner
│   │   ├── google-auth.ts      # Cross-platform Google OAuth
│   │   ├── network.ts          # Cross-platform network state detection
│   │   ├── offline-analytics.ts # Analytics event queue with auto-flush
│   │   ├── offline-llm.ts      # On-device LLM download, management & inference
│   │   ├── payment.ts          # Razorpay Payment Links
│   │   └── secure-storage.ts   # expo-secure-store wrapper
│   ├── lib/
│   │   ├── types.ts            # TypeScript types
│   │   └── content.ts          # 16-section template, prompts & time allocation
│   └── theme/
│       └── colors.ts           # Color palette
├── assets/                     # App icons & splash screen
├── docs/                       # Documentation
│   ├── ACCOUNT_DELETION.md     # Account & data deletion guide
│   ├── KEY_MANAGEMENT.md       # API key creation & management guide
│   ├── PUBLISHING_STEPS.md     # This file
│   ├── PRIVACY_POLICY.md       # Privacy policy
│   └── PRD.md                  # Product requirements document
├── app.config.js               # Expo config (dynamic, env vars, deep linking)
├── .easignore                  # EAS upload rules (includes .env, unlike .gitignore)
├── eas.json                    # EAS Build & Submit config
├── jest.config.js              # Jest test configuration
├── LICENSE.md                  # License
└── package.json
```

## Prerequisites

- **Node.js** 18+
- **Git** — Required by EAS CLI to detect the project root and bundle files. Install from https://git-scm.com/download/win (Windows) or your package manager. After installing, initialize a repo in the project:
  ```bash
  git init
  git add -A
  git commit -m "initial commit"
  ```
- **EAS CLI**: `npm install -g eas-cli`
- **Expo account**: https://expo.dev/signup
- **Dependencies installed**: Always run `npm install` before building to ensure all plugins (expo-router, etc.) can be resolved
- For Google Play: **Google Play Developer account** ($25 one-time fee)
- For Apple App Store: **Apple Developer Program** ($99/year)

## Getting Started

```bash
# Install dependencies
npm install

# Generate native Android project (not checked into git)
npx expo prebuild --platform android

# Create local.properties for Android SDK
echo "sdk.dir=C:/Users/YOUR_USER/AppData/Local/Android/Sdk" > android/local.properties

# Start development server
npx expo start

# Run on web
npx expo start --web
```

> **Important:** The `android/` folder is **not** committed to the repository — it contains 800 MB+ of generated native code, Gradle caches, and build artifacts. Run `npx expo prebuild --platform android` after cloning to regenerate it. You'll also need to:
> 1. Create `android/local.properties` with your SDK path
> 2. Configure the release signing key in `android/app/build.gradle` (see [Signing Key Recovery](#signing-key-recovery-from-eas) below)
> 3. Optionally add Gradle optimizations to `android/gradle.properties` (parallel builds, 4096m heap, PNG crunching disabled)

## Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_oauth_android_client_id
EXPO_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
EXPO_PUBLIC_GA_API_SECRET=your_ga4_api_secret
EXPO_PUBLIC_RAZORPAY_PAYMENT_LINK=https://rzp.io/rzp/xxxxx
```

---

## Publishing to Google Play Store (Android)

### Step 1: Create a Google Play Developer Account

1. Go to https://play.google.com/console
2. Sign in with your Google account
3. Pay the **$25 one-time registration fee**
4. Complete identity verification (may take 1–2 days)

### Step 2: Prepare App Assets

You need the following ready before uploading:

| Asset | Specification |
|-------|--------------|
| **App icon** | 512×512 PNG (already at `assets/icon.png`) |
| **Feature graphic** | 1024×500 PNG (create in Canva/Figma — shown at top of store listing) |
| **Screenshots** | At least 2 phone screenshots (1080×1920 or similar). Take from emulator or device |
| **Short description** | Max 80 characters, e.g. "Turn your flight time into knowledge with AI-generated guides" |
| **Full description** | Up to 4000 characters describing the app |
| **Privacy policy URL** | Required — host a privacy policy page (e.g. on Google Sites, Notion, or your domain) |

### Step 3: Update App Version (if needed)

In [app.config.js](app.config.js), update the version:

```js
version: '1.0.0',        // Display version
android: {
  versionCode: 2,         // MUST be higher than any previously uploaded bundle
  package: 'com.boreding.app',
}
```

> **Critical:** Google Play rejects uploads if the `versionCode` is not strictly higher than every previously uploaded bundle. The `eas.json` has `"autoIncrement": true` for production builds, which bumps this automatically on each EAS build. If you ever need to set it manually, check the highest existing `versionCode` in Google Play Console → Release → App bundle explorer.

### Step 4: Switch to Production Razorpay Keys

In your `.env`, replace test keys with live keys:

```env
EXPO_PUBLIC_RAZORPAY_PAYMENT_LINK=https://rzp.io/rzp/your_live_link
```

Get live keys from: https://dashboard.razorpay.com → Settings → API Keys (switch to **Live Mode**)

### Step 5: Build the Production AAB

**Option A — Local Gradle Build (fast, no cloud wait):**

```powershell
# PowerShell (Windows) — set environment and build
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NODE_ENV = "production"

# Build AAB (ARM only, no emulator arch)
& ".\android\gradlew.bat" bundleRelease `
  -x lint -x lintVitalAnalyzeRelease `
  -x lintVitalReportRelease -x lintVitalRelease `
  -PreactNativeArchitectures="armeabi-v7a,arm64-v8a" `
  -p ".\android"
```

The `.aab` file will be at: `android/app/build/outputs/bundle/release/app-release.aab`

> **Note:** If this is a clean build after `expo prebuild --clean`, you must recreate `android/local.properties` with `sdk.dir=C:/Users/YOUR_USER/AppData/Local/Android/Sdk` and re-apply gradle optimizations in `android/gradle.properties` (parallel builds, caching, JVM heap).

**Option B — EAS Cloud Build:**

```bash
# Login to EAS (one-time)
eas login

# Make sure dependencies are installed
npm install

# Build a production Android App Bundle
eas build --platform android --profile production
```

- This runs in the cloud on Expo's servers — no local Android Studio needed
- The `versionCode` auto-increments on each build (configured in `eas.json`)
- Wait for the build to finish (usually 10–20 minutes)
- When done, **download the `.aab` file** from the link shown in terminal or from https://expo.dev → your project → Builds

### Step 6: Create the App on Google Play Console

1. Go to https://play.google.com/console
2. Click **"Create app"**
3. Fill in:
   - **App name**: Boreding
   - **Default language**: English
   - **App or Game**: App
   - **Free or Paid**: Free (in-app upgrades via Razorpay)
4. Accept the declarations and click **Create app**

### Step 7: Complete the Store Listing

Navigate to **Grow → Store listing → Main store listing**:

1. **Short description**: "Turn your flight time into knowledge with AI-generated guides"
2. **Full description**: Write a compelling description covering key features (AI content generation, progressive loading, offline LLM support, Gmail flight detection, interactive quiz, social sharing)
3. **App icon**: Upload your 512×512 icon
4. **Feature graphic**: Upload your 1024×500 banner
5. **Phone screenshots**: Upload at least 2 screenshots
6. Save

### Step 8: Complete Content Rating

Navigate to **Policy → App content → Content rating**:

1. Click **Start questionnaire**
2. Select category: **Reference, News, or Educational**
3. Answer questions honestly (no violence, no gambling, etc.)
4. Submit — you'll get a content rating (likely **Everyone**)

### Step 9: Set Up Pricing & Distribution

Navigate to **Monetize → App pricing**:

1. Set price as **Free**
2. Under **Countries/regions**, select all countries you want to distribute to

### Step 10: Complete Data Safety Form

Navigate to **Policy → App content → Data safety**:

1. Declare data collected:
   - **Email address** (if using Gmail agent) — optional, not stored server-side
   - **App interactions / analytics** — GA4 anonymous analytics
   - **Payment info** — handled by Razorpay (third-party processor)
   - **Files downloaded** — Offline LLM models stored locally in app directory (user-initiated)
2. Declare that data is **encrypted in transit** (HTTPS)
3. Declare that API keys are **stored on-device only**
4. Declare that offline model files are **stored on-device only** and downloaded from public Hugging Face repositories
5. Submit

### Step 11: Upload the AAB & Create a Release

1. Navigate to **Production → Releases → Create new release**
2. If prompted about app signing, click **Continue** (Google manages signing keys by default)
3. Upload the `.aab` file you downloaded in Step 5
4. Add **release notes** (e.g. "Initial release — AI-powered in-flight learning")
5. Click **Review release** → **Start rollout to Production**

### Step 12: Submit for Review

- Google will review the app (typically **1–3 days** for new apps, sometimes up to **7 days**)
- You'll receive an email when the app is approved or if changes are needed
- Once approved, the app goes live on the Play Store

### (Optional) Automate Future Uploads with EAS Submit

```bash
# Upload directly to Play Console from the command line:
eas submit --platform android --profile production
```

This requires a **Google Service Account JSON key** file. Set it up:

1. Go to https://console.cloud.google.com → IAM & Admin → Service Accounts
2. Create a service account with **No role**
3. Create & download a JSON key
4. In Google Play Console → Settings → API access → Link the service account
5. Grant **Release manager** permission
6. Place the JSON key in your project as `google-services.json`
7. The `eas.json` already has `"serviceAccountKeyPath": "./google-services.json"` configured

---

## Publishing to Apple App Store (iOS)

### Step 1: Enroll in the Apple Developer Program

1. Go to https://developer.apple.com/programs/
2. Click **Enroll** and sign in with your Apple ID
3. Pay the **$99/year** fee
4. Complete identity / organization verification (can take 1–2 days)

### Step 2: Prepare App Assets

| Asset | Specification |
|-------|--------------|
| **App icon** | 1024×1024 PNG, no transparency, no rounded corners (Apple adds them) |
| **Screenshots** | Required for each device size you support. At minimum: 6.7" (iPhone 15 Pro Max: 1290×2796) and 6.5" (iPhone 11 Pro Max: 1242×2688). Use Simulator or Figma mockups |
| **Privacy policy URL** | Required |
| **Description** | Up to 4000 characters |
| **Subtitle** | Up to 30 characters (shown under app name) |
| **Keywords** | Comma-separated, up to 100 characters total |
| **Support URL** | Required (your website, GitHub page, or email contact page) |

### Step 3: Configure iOS in app.config.js

Ensure your [app.config.js](app.config.js) has the correct iOS config:

```js
ios: {
  supportsTablet: false,
  bundleIdentifier: 'com.boreding.app',
  buildNumber: '1',     // Increment for each upload (1, 2, 3, ...)
},
```

### Step 4: Register the App on Apple Developer Portal

This is usually handled automatically by EAS Build, but you can also do it manually:

1. Go to https://developer.apple.com/account/resources/identifiers
2. Click **+** → **App IDs** → **App**
3. **Bundle ID**: `com.boreding.app`
4. **Description**: Boreding
5. Enable capabilities if needed (none special required for this app)

### Step 5: Create the App on App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Boreding
   - **Primary language**: English
   - **Bundle ID**: `com.boreding.app` (select from dropdown)
   - **SKU**: `boreding-app` (any unique string)
4. Click **Create**

### Step 6: Build for iOS with EAS

```bash
# Build a production iOS archive (.ipa)
# On PowerShell (Windows):
$env:EAS_NO_VCS="1"; eas build --platform ios --profile production

# On Bash/macOS/Linux:
EAS_NO_VCS=1 eas build --platform ios --profile production
```

- EAS will ask you to log in with your **Apple ID** during the first build
- It will automatically create provisioning profiles and certificates
- Wait for the build to finish (usually 15–30 minutes)

### Step 7: Submit the Build to App Store Connect

**Option A — Use EAS Submit (recommended):**

```bash
eas submit --platform ios
```

- Select the build you just created
- EAS will upload it to App Store Connect automatically

**Option B — Manual upload:**

1. Download the `.ipa` from https://expo.dev → Builds
2. On a Mac, open **Transporter** (free app from Mac App Store)
3. Drag & drop the `.ipa` into Transporter and click **Deliver**

### Step 8: Complete the App Store Listing

In App Store Connect → Your App → **App Information**:

1. **Subtitle**: "Learn on the fly"
2. **Category**: Education
3. **Content Rights**: Declare you have rights to all content
4. **Age Rating**: Fill out the questionnaire (likely rated 4+)

In **App Privacy**:

1. Click **Get Started**
2. Declare data types:
   - **Contact Info → Email** — Optional, used for Gmail flight detection
   - **Usage Data → Product Interaction** — GA4 anonymous analytics
   - **Identifiers → Device ID** — Anonymous analytics client ID
3. For each: mark as **Not linked to user identity**

In **Pricing and Availability**:

1. Set price as **Free**
2. Select countries/regions for availability

### Step 9: Create a New Version & Submit

1. In App Store Connect → Your App → **iOS App** section
2. Under **Build**, click **+** and select the build you uploaded in Step 7
3. Fill in:
   - **What's New**: "Initial release"
   - **Screenshots**: Upload for each required device size
   - **Description**: Full app description
   - **Keywords**: "flight, learning, travel, AI, education, quiz, destination"
   - **Support URL**: Your support link
   - **Privacy Policy URL**: Your privacy policy link
4. Under **App Review Information**, provide a demo credential or note: "No login required to test core functionality. Gmail sign-in is optional."
5. Click **Save** → **Add for Review** → **Submit to App Review**

### Step 10: Wait for App Review

- Apple typically reviews within **24–48 hours**
- If rejected, read the feedback, make changes, rebuild, and resubmit
- Common rejection reasons for first-time apps:
  - Missing privacy policy
  - Screenshots don't match app functionality
  - App does nothing without network (note: the app needs internet for AI generation)
  - Incomplete metadata

---

## Building Both Platforms at Once

```bash
# Build Android + iOS simultaneously
# On PowerShell (Windows):
$env:EAS_NO_VCS="1"; eas build --platform all --profile production

# On Bash/macOS/Linux:
EAS_NO_VCS=1 eas build --platform all --profile production
```

## Troubleshooting

### "You can't rollout this release because it doesn't allow any existing users to upgrade"

This Google Play Console error means the `versionCode` in your new bundle is **not higher** than the previously uploaded bundle. Fix:

1. Check the highest existing `versionCode` in **Google Play Console → Release → App bundle explorer**
2. Set `android.versionCode` in `app.config.js` to a value **higher** than that number
3. Rebuild with `eas build` — the `autoIncrement: true` setting in `eas.json` handles this automatically for future builds

### "Failed to resolve plugin for module 'expo-router'"

EAS CLI evaluates `app.config.js` locally before uploading. If `node_modules` is missing or incomplete, plugins can't be resolved. Fix:

1. Run `npm install` before building
2. Ensure **Git is installed** — EAS CLI uses `git` to detect the project root. Without it, the fallback config resolver may fail to find `node_modules`. Install Git from https://git-scm.com and initialize a repo (`git init && git add -A && git commit -m "init"`)
3. If Git is unavailable, set the project root explicitly:
   ```bash
   # PowerShell:
   $env:EAS_PROJECT_ROOT = "C:\path\to\boreding"
   # Bash:
   export EAS_PROJECT_ROOT=/path/to/boreding
   ```

### "Cannot find module 'dotenv'"

The `app.config.js` imports `dotenv` which may not be available in all contexts. The current config wraps it in a try/catch so this should not occur. If it does, run `npm install` to ensure `dotenv` is in `node_modules`.

---

## Updating the App After Launch

1. Update the `version` in `app.config.js` (e.g. `1.0.0` → `1.1.0`)
2. The `versionCode` (Android) and `buildNumber` (iOS) auto-increment via EAS — no manual bump needed
3. Rebuild:
   ```bash
   # PowerShell:
   $env:EAS_NO_VCS="1"; eas build --platform all --profile production
   # Bash:
   EAS_NO_VCS=1 eas build --platform all --profile production
   ```
4. Submit:
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```
5. Add release notes in Play Console / App Store Connect and submit for review

## Quick Reference: EAS Commands

| Command | Purpose |
|---------|---------|
| `eas login` | Log in to Expo account |
| `$env:EAS_NO_VCS="1"; eas build --platform android --profile preview` | Build debug APK for testing (PowerShell) |
| `$env:EAS_NO_VCS="1"; eas build --platform android --profile production` | Build production AAB for Play Store (PowerShell) |
| `$env:EAS_NO_VCS="1"; eas build --platform ios --profile production` | Build production IPA for App Store (PowerShell) |
| `$env:EAS_NO_VCS="1"; eas build --platform all --profile production` | Build both platforms (PowerShell) |
| `eas submit --platform android` | Upload AAB to Google Play Console |
| `eas submit --platform ios` | Upload IPA to App Store Connect |

## Key Differences from Web Version

- Uses `expo-secure-store` instead of browser localStorage for API keys
- Uses `expo-web-browser` for OAuth flows (Google sign-in)
- Uses `react-native-razorpay` for in-app payment checkout (native SDK, not browser redirect)
- Uses `expo-auth-session` for native Google OAuth (web uses popup flow)
- GA4 via Measurement Protocol HTTP API (no gtag.js) with offline event queue
- `react-native-view-shot` for share card screenshots
- Custom `CrossPlatformSlider` for native + web support
- On-device LLM inference via `llama.rn` for offline content generation (native only)
- Progressive loading with background generation and real-time content streaming
- Rich markdown rendering for formatted content display
- Sticky section headers with scroll progress tracking

| Feature | Web (Next.js) | Mobile (Expo) |
|---------|---------------|---------------|
| AI API calls | Server-side via API routes | Direct from device + on-device LLM fallback |
| API keys | Env vars on server | Stored on-device (expo-secure-store) |
| Gmail scanning | OAuth + Gmail API | OAuth + Gmail API (AI + regex extraction) |
| Auth | NextAuth (Google OAuth) | expo-auth-session (native) / popup (web) |
| Analytics | GA4 (gtag.js) | GA4 Measurement Protocol + offline queue |
| Styling | Tailwind CSS | React Native StyleSheet |
| Animations | framer-motion | react-native-reanimated |
| Icons | @phosphor-icons/react | Emoji (lightweight) |
| Sharing | modern-screenshot + Web Share | ViewShot + expo-sharing |
| Navigation | Single page state | Expo Router (file-based) |
| Offline | Not supported | Offline LLM + analytics queue + content persistence |
| Content loading | All at once | Progressive (first batch → navigate → background loading) |
| Text rendering | HTML/Markdown | Custom markdown parser → styled React Native Text components |

### Signing Key Management

The release signing keystore is managed by EAS and stored on Expo's servers. To recover it locally (e.g., for local Gradle builds):

1. Ensure **Git** is installed and the project is a git repo (`git init && git add -A && git commit -m init`)
2. Run `npx eas credentials -p android` and select **"Download existing keystore"**
3. Or use the automated script at `scripts/download-keystore.js` which downloads via Expo's GraphQL API
4. Configure `android/app/build.gradle` signing config to point to the downloaded `.jks` file

> **Important:** Never commit keystore files or passwords to version control. Add `*.jks` and `*.keystore` to `.gitignore`.

## Replacing Placeholder Icons

Replace the placeholder assets with your actual app icons:

- `assets/icon.png` — 1024×1024px app icon
- `assets/adaptive-icon.png` — 1024×1024px Android adaptive icon foreground
- `assets/splash-icon.png` — 200×200px splash screen logo
