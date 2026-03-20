# Boreding — Learn on the Fly ✈️

Transform your flight time into valuable learning with AI-generated, personalized content matched to your journey duration — online or offline.

**Platform:** Android & iOS (React Native / Expo)  
**Package:** `com.boreding.app`  
**Build System:** Local Gradle builds (fast iteration) or EAS Build (cloud CI)

## What It Does

Boreding turns dead flight time into productive learning. Tell the app where you're flying, pick a topic (or let it default to your destination), and it generates a personalized reading guide calibrated to your exact flight duration. Sections cover everything from culture and food to history, language basics, and hidden gems. Content is formatted with rich text — bold headings, bullet lists, inline tips — for a polished reading experience. When you're done reading, a 5-question quiz tests what you've learned, and you can share your score to social media before you've even left the airport.

### User Flow

1. **Select flight** — Pick departure and arrival airports from a database of 500+ airports, or use the Gmail AI Agent to auto-detect an upcoming flight from your booking confirmation emails.
2. **Adjust content duration** — A slider lets you choose how much of your flight time to fill with reading (0–100% of estimated flight time, snapping to 5% increments).
3. **Choose topic** — Optionally specify any learning topic (e.g. "Machine Learning", "Guitar basics", "Stoic Philosophy"). If left blank, content defaults to a guide about your destination city.
4. **Generate content** — AI generates multiple content sections in batches of 4. The first batch loads on a loading screen with an animated airplane, rotating flight facts, and a section checklist; once ready, you're taken straight to the content reader while remaining sections continue generating in the background.
5. **Read sections** — Expandable section cards with rich markdown rendering, sticky section headers with scroll progress, estimated reading times, and automatic completion marking.
6. **Take quiz** — 5 AI-generated multiple-choice questions based on the content you just read.
7. **Share results** — Screenshot-based sharing to Instagram, Twitter/X, WhatsApp, and the native share sheet. Results images are saved to your gallery.

---

## Features

### 🤖 AI-Powered Content Generation
- **Dual AI engine** — Gemini is the primary model (`gemini-2.5-flash-lite` for free tier, `gemini-2.5-flash` for premium). If Gemini fails or times out, OpenAI (`gpt-4o-mini`) is used as an automatic fallback.
- **Batched parallel generation** — Sections are generated in batches of 4, with all sections in a batch generated concurrently via parallel LLM calls with timeout protection.
- **Progressive loading** — The first batch of sections triggers navigation to the content reader immediately. Remaining batches continue generating in the background, with a pulsing "Writing…" indicator on sections that are still loading.
- **Real-time progress UI** — A dedicated generation screen (with animated airplane SVG and rotating flight facts) shows which section is currently being generated and which are complete.
- **Rich markdown content** — Generated text is rendered with proper formatting: **bold**, *italic*, headings (`#`, `##`, `###`), bullet lists, numbered lists, and inline callouts — no raw asterisks or markdown syntax visible to the reader.
- **Up to 16 structured sections** — Content is organized into prioritized reading blocks (overview, culture, food, attractions, practical tips, history, language, hidden gems, neighborhoods, itineraries, shopping, nature, nightlife, festivals, etiquette, day trips — or custom topic sections). Sections are allocated by weighted priority based on available reading time.
- **Bring Your Own Key (BYOK)** — Users can enter their own Gemini or OpenAI API key. Keys are stored securely on-device via `expo-secure-store` and are never transmitted to any server other than the respective AI provider.
- **Topic validation** — Custom topics are validated by AI to ensure they're meaningful (not gibberish or spam) before generation begins.

### 📴 Offline LLM Support
- **On-device AI models** — Download a micro-LLM (SmolLM2 360M at ~230 MB or TinyLlama 1.1B at ~670 MB) for content generation without internet.
- **Hugging Face-hosted models** — GGUF-format models are downloaded directly from Hugging Face; no API keys or credentials required.
- **Download management** — Progress tracking with cancel/pause support. Downloads are resumable and stored in the app's document directory.
- **Automatic offline fallback** — When the device is offline and a model is downloaded, the AI router automatically switches to on-device inference via `llama.rn`.
- **Smart nudge** — After reading your first section, the app suggests downloading an offline model for future flights (shown once, dismissal persisted).
- **Network awareness** — Real-time online/offline status banner with cross-platform network detection (web: `navigator.onLine`; native: `@react-native-community/netinfo`).

### 🛫 Smart Flight Detection
- **500+ airport database** with instant search-as-you-type filtering by IATA code, city name, or airport name.
- **Automatic flight duration estimation** based on great-circle distance (Haversine formula) between the selected airports.
- **Content duration slider** — Adjustable from 0–100% of estimated flight time (snaps to 5% increments, defaults to 80%). A 4-hour flight at 50% generates ~2 hours of reading content.
- **Gmail AI Agent** — Sign in with Google OAuth to let the app scan your recent Gmail for flight booking confirmation emails. The agent:
  - Filters out promotional emails using keyword heuristics (blacklist: offer, sale, discount; whitelist: booking ID, confirmation, itinerary).
  - Uses AI to extract departure/arrival airports and dates from email content.
  - Has a multi-pattern regex fallback parser for structured booking confirmations.
  - Supports both city names and IATA codes in emails.
  - Only flight-related emails are read; no email data is stored server-side.

### 📖 Content Reader
- **Expandable section cards** — Each section is a collapsible card showing an icon emoji, title, and estimated reading time. Cards display status badges ("Writing" with pulsing dot for pending, "Done" for completed).
- **Sticky section headers** — When scrolling within an expanded section, a floating sticky header appears at the top with the section icon, title, and an animated horizontal progress bar.
- **High-water-mark progress** — Progress bars track the maximum scroll depth reached per section (never decrease). Progress is calculated from absolute viewport position relative to content.
- **Auto-completion at 95%** — Sections are automatically marked as complete when 95% scrolled.
- **Scroll-to-section-top** — Expanding a section scrolls it to the top of the viewport. Collapsing saves the scroll offset; re-expanding restores the exact reading position.
- **Rich markdown callouts** — In addition to standard formatting, content includes styled callout blocks: 💡 **Pro Tip** (amber border) and 🤔 **Did You Know** / 🎲 **Fun Fact** (blue border).
- **Progress ring** — A header ring shows overall reading completion percentage. Color transitions from sky blue (in progress) to emerald green (all complete).
- **Coverage badge** — Shows what percentage of flight time the reading covers.
- **Consistent navigation** — Back button uses `router.replace('/')` for a consistent right-to-left slide animation throughout the app.
- **Offline persistence** — Generated content is stored in AsyncStorage and remains readable without a network connection.

### 📝 Interactive Quiz
- 5 AI-generated multiple-choice questions drawn directly from the content the user just read.
- Quiz generation runs concurrently with the last content batch for faster readiness.
- Per-question answer tracking with immediate correct/incorrect visual feedback.
- Score tiers with labels:
  - **Destination Expert** — 4–5 correct
  - **Well Prepared** — 3 correct
  - **Getting There** — 0–2 correct
- Animated transitions between questions via Reanimated.
- Option to retake the quiz after viewing results.

### 📤 Social Sharing
- A screenshot-ready results card is generated with `react-native-view-shot`, containing the user's score, sections completed, flight route, and duration.
- **Save to gallery** via `expo-media-library`.
- **Direct sharing** — Instagram (opens the app with the saved screenshot), Twitter/X (pre-filled tweet with score), WhatsApp (pre-filled message).
- **Native share sheet** fallback via `expo-sharing` for any other app.

### 💎 Premium Upgrade
- **Freemium model with token system** — The free tier uses lightweight AI models (`gemini-2.5-flash-lite`, `gpt-4o-mini`); premium unlocks higher-quality models (`gemini-2.5-pro`, `gpt-4o`) for richer, more detailed content. Premium access is tracked via a token balance system.
- **Native Razorpay SDK** — In-app checkout modal via `react-native-razorpay` — no browser redirects. Payment completes within the app and returns a direct callback.
- Payment status and token balance stored locally in `expo-secure-store`.
- Celebration animation (bounce-in with glow) when the user returns as premium.
- Premium badge and token status displayed on the home screen.

### 📊 Analytics (GA4 Measurement Protocol)
- Server-side event tracking via the GA4 Measurement Protocol — no native Firebase SDK required.
- A persistent anonymous `client_id` is stored in AsyncStorage (never linked to user identity).
- **Offline event queue** — Analytics events are queued when the device is offline and automatically flushed when connectivity is restored.
- Events tracked across the full lifecycle:
  - `generate_start` / `generate_complete` / `generate_error` — content generation
  - `section_complete` / `all_sections_complete` — reading progress
  - `quiz_attempt` / `quiz_answer` / `quiz_complete` / `retake_quiz` — quiz engagement
  - `share_click` (with method: Instagram, Twitter, WhatsApp, native) — sharing
  - `agent_click` / `agent_scan_result` — Gmail AI agent
  - `upgrade_click` — premium funnel
  - `offline_generation` / `offline_model_download_start` / `offline_model_download_complete` / `offline_model_download_error` / `offline_model_deleted` — offline LLM
  - `app_error` (with `error_code`, `error_message`, `screen`, `raw_error`) — classified error tracking
  - `route_pairing`, `topic_selected`, `button_click` — general interactions

### 🔒 Privacy & Security
- **Secure storage** — API keys and OAuth tokens are stored via `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android). On web, `AsyncStorage` is used as a fallback.
- **Gmail** — Only flight booking confirmation emails are read. No email content is stored or transmitted beyond the on-device AI parsing step.
- **Analytics** — Fully anonymous. No PII, no email addresses, no browsing history. Only random client/session IDs and event names.
- **Payments** — All payment details are handled entirely by Razorpay. The app only observes success/failure status.
- **Offline models** — Downloaded from public Hugging Face repositories. No authentication tokens or user credentials are needed or transmitted.

### 🌙 Dark Theme UI
- Full dark theme — slate-900 (`#0f172a`) background with sky-400/emerald-400 accent colors.
- Animated rainbow gradient border on the Gmail Agent button — SVG-based stroke animation using `react-native-svg` with animated `strokeDashoffset` (native) and CSS keyframes (web).
- Smooth enter animations (`FadeInUp`, `FadeIn`, `FadeInRight`) throughout.
- Custom airplane SVG component with gradient fills and animated flight path.
- Cross-platform slider component (native slider for mobile, HTML5 range input for web).
- Content-first, minimal-chrome design with generous spacing for comfortable reading.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React Native 0.79 + Expo SDK 53 |
| Routing | Expo Router 5 (file-based) |
| Language | TypeScript 5.8 |
| AI (Cloud) | Google Gemini (`@google/generative-ai`), OpenAI (raw `fetch`) |
| AI (On-Device) | `llama.rn` 0.4 (GGML inference for GGUF models) |
| Auth | Google OAuth via `expo-auth-session/providers/google` (native) / popup (web) |
| Payments | Razorpay native SDK (`react-native-razorpay` 2.3) |
| Analytics | GA4 Measurement Protocol (server-side HTTP) with offline queue |
| Storage | `expo-secure-store`, `@react-native-async-storage/async-storage` |
| Animations | `react-native-reanimated` 3.17 |
| Sharing | `expo-sharing`, `react-native-view-shot`, `expo-media-library` |
| Networking | `@react-native-community/netinfo`, `expo-file-system` |
| UI | `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `expo-linear-gradient` |
| Build | EAS Build (cloud), EAS Submit |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **EAS CLI**: `npm install -g eas-cli`
- **Expo account**: [expo.dev/signup](https://expo.dev/signup)

```bash
# Install dependencies
npm install

# Generate native Android project (not checked into git)
npx expo prebuild --platform android

# Start development server
npx expo start

# Run on web
npx expo start --web
```

> **Note:** The `android/` folder is not committed to the repository (it's 800 MB+ of generated code and build artifacts). Run `npx expo prebuild --platform android` after cloning to regenerate it. After prebuild, create `android/local.properties` with `sdk.dir=C:/Users/YOUR_USER/AppData/Local/Android/Sdk` (your Android SDK path). See [PUBLISHING_STEPS.md](docs/PUBLISHING_STEPS.md) for signing and build details.

### Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_oauth_android_client_id
EXPO_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
EXPO_PUBLIC_GA_API_SECRET=your_ga4_api_secret
EXPO_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL=https://rzp.io/rzp/xxxxx
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
```

| Variable | Purpose |
|----------|--------|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Built-in Gemini API key (used when the user doesn't BYOK) |
| `EXPO_PUBLIC_OPENAI_API_KEY` | Built-in OpenAI API key (fallback) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web client ID for the Gmail agent |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID (tied to SHA-1 + package name) |
| `EXPO_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID for analytics |
| `EXPO_PUBLIC_GA_API_SECRET` | GA4 Measurement Protocol API secret |
| `EXPO_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL` | Razorpay Payment Link URL for premium upgrade |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Key ID for native SDK checkout |

---

## Project Structure

```
boreding/
├── app/                              # Expo Router screens
│   ├── _layout.tsx                   # Root layout (dark theme, network & model init)
│   ├── index.tsx                     # Home — airport picker, duration slider, topic input, BYOK, Gmail agent, offline model, upgrade CTA
│   ├── content.tsx                   # Content reader — sticky headers, expandable sections, progress ring, markdown rendering
│   ├── quiz.tsx                      # 5-question multiple-choice quiz with scoring
│   ├── share.tsx                     # Results card (screenshot-able) & social sharing buttons
│   └── payment-success.tsx           # Razorpay deep-link callback & payment confirmation
├── src/
│   ├── components/
│   │   ├── AirportPicker.tsx         # Search-as-you-type airport selector
│   │   ├── AirplaneSvg.tsx           # Custom airplane icon SVG with animated flight path
│   │   ├── AnimatedGradientBorder.tsx # Animated rainbow gradient border (SVG stroke-dash on native, CSS on web)
│   │   ├── CrossPlatformSlider.tsx   # Native slider with web HTML range fallback
│   │   ├── ErrorBoundary.tsx         # React error boundary with error codes & recovery UI
│   │   ├── GeneratingScreen.tsx      # Loading screen with flight facts & section checklist
│   │   ├── OfflineModelCard.tsx      # Offline LLM download/manage UI card
│   │   └── SectionCard.tsx           # Expandable content section with scroll-based completion
│   ├── services/
│   │   ├── ai-router.ts             # Gemini → OpenAI → offline LLM fallback with BYOK support
│   │   ├── airports.ts              # 500+ airport database, search, Haversine flight duration calc
│   │   ├── analytics.ts             # GA4 Measurement Protocol event tracking + error telemetry
│   │   ├── error-codes.ts           # Centralized error code registry (E1xx–E9xx) with messages
│   │   ├── generate.ts              # Batched parallel section generation orchestrator
│   │   ├── generation-manager.ts    # Pub/sub real-time content state management
│   │   ├── gmail-agent.ts           # Gmail OAuth, email scanning, flight extraction via AI + regex
│   │   ├── google-auth.ts           # Cross-platform Google OAuth (web popup / native expo-auth-session)
│   │   ├── network.ts               # Cross-platform network state detection & listeners
│   │   ├── offline-analytics.ts     # Offline analytics event queue with auto-flush
│   │   ├── offline-llm.ts           # On-device LLM download, management, and inference (llama.rn)
│   │   ├── payment.ts               # Razorpay native SDK checkout (react-native-razorpay)
│   │   └── secure-storage.ts        # expo-secure-store wrapper with web AsyncStorage fallback
│   ├── lib/
│   │   ├── types.ts                 # TypeScript type definitions
│   │   └── content.ts               # 16-section template, prompts, time allocation logic
│   ├── theme/
│   │   └── colors.ts                # Color palette (slate, sky, emerald, amber, etc.)
│   └── types/
│       └── react-native-razorpay.d.ts # Razorpay type declarations
├── assets/                           # App icons & splash screen
├── docs/                             # Documentation
│   ├── PUBLISHING_STEPS.md           # App store publishing guide
│   ├── PRIVACY_POLICY.md             # Privacy policy
│   └── PRD.md                        # Product requirements document
├── app.config.js                     # Expo config (dynamic, deep linking, plugins)
├── eas.json                          # EAS Build & Submit config
├── LICENSE.md                        # License
└── package.json
```

---

## Error Handling & Edge Cases

Boreding is designed so that the user **never sees a raw error screen**. Every error is caught, classified with a unique error code, shown as a clean message, and tracked in telemetry.

### Error Code System

All errors are classified into coded categories and tracked via GA4 (`app_error` event). If anything goes wrong, the user sees a friendly message with a recovery action and an error code — never a stack trace or crash screen.

| Code Range | Category | Examples |
|-----------|----------|----------|
| **E1xx** | Content generation | `E100` AI generation failed, `E101` invalid topic, `E102` parse error, `E103` timeout, `E104` no API key |
| **E2xx** | Network | `E200` network request failed, `E201` offline with no local model |
| **E3xx** | Authentication | `E300` Google OAuth failed, `E301` Gmail scan failed, `E302` token expired |
| **E4xx** | Payment | `E400` payment failed, `E401` verification failed |
| **E5xx** | Storage | `E500` read failed, `E501` write failed, `E502` secure storage failed |
| **E6xx** | Screen / rendering | `E600` content load failed, `E601` quiz load failed, `E602` share load failed, `E603` component render crash |
| **E7xx** | Offline model | `E700` download failed, `E701` inference failed, `E702` model corrupt |
| **E9xx** | Unknown | `E999` unexpected error |

### Error Boundaries

Every screen is wrapped in a React `ErrorBoundary` component. If a rendering crash occurs anywhere, the user sees a clean error card with the error code, a friendly message, and a "Try Again" button that resets the screen — never a white screen or stack trace.

### Recovery Strategy

- **Generation errors** — fallback chain: Gemini → OpenAI → offline LLM. If all fail, user sees error message with code and retry option.
- **Screen load failures** — user is automatically navigated back to the last clean screen (home).
- **Network loss mid-generation** — continues with offline LLM if available; partial content is preserved.
- **JSON parse failures** — caught and classified as `E102`/`E500`; user is redirected to home.
- **Payment failures** — caught and shown with `E4xx` code; user stays on home screen.
- **Storage failures** — all `AsyncStorage` and `SecureStore` operations are wrapped in try/catch; app degrades gracefully.

### Telemetry

Every error fires a GA4 `app_error` event with:
- `error_code` — the classified error code (e.g. `E100`)
- `error_message` — the user-facing message
- `screen` — which screen the error occurred on
- `raw_error` — first 200 chars of the original error (for debugging)

### Additional Edge Cases

- **Very short / very long flights** — Minimum 15-minute content generation. The slider allows 0–100% of flight time.
- **No API key available** — Prompts user to enter a BYOK key; error code `E104` if missing.
- **Gmail agent finds no flights** — Displays "No flight details found"; user can manually select airports.
- **Promotional email filtering** — Keyword heuristics filter out marketing emails before AI parsing.
- **Payment browser dismiss** — Shows confirmation dialog; no crash if browser is closed.
- **Offline after generation** — Content is stored in AsyncStorage and remains readable without network.
- **Cross-platform fallbacks** — Web uses `AsyncStorage` for SecureStore, HTML range input for slider, `window.alert` for native Alert. Offline LLM is native-only.
- **JSON parse failures** — Batch content responses have fallback chunking if `---SECTION:` delimiters fail.

---

## Publishing

See [PUBLISHING_STEPS.md](docs/PUBLISHING_STEPS.md) for detailed step-by-step guides to publish on Google Play Store and Apple App Store, including EAS Build commands, store listing preparation, and automated submission setup.

## Privacy

See [PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md) for the full privacy policy.

## License

See [LICENSE.md](LICENSE.md) for license details.
