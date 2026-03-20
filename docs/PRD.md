# Boreding — In-Flight Learning App

## Core Purpose & Success

**Mission Statement**: Help air travelers transform their flight time into valuable learning through AI-generated, personalized content that matches their journey duration — with full offline capability for use during flights.

**Success Indicators**:
- Users complete reading content that matches their flight duration
- Content feels personalized, well-formatted, and relevant to their selected topic or destination
- Users score well on the knowledge quiz and share results on social media
- Premium conversions via Razorpay upgrade flow
- Users download offline models to use Boreding without internet during flights
- Content loading feels instant thanks to progressive generation

**Experience Qualities**: Educational, Personalized, Engaging, Shareable, Offline-Capable

## Platform

**Type**: Mobile app (Android & iOS) built with React Native (Expo)  
**Framework**: Expo SDK 53, Expo Router 5 (file-based routing)  
**Build System**: Local Gradle builds (Android) for fast iteration, or EAS Build (cloud CI for production)  
**Package**: `com.boreding.app` (Android & iOS)  
**Deep Link Scheme**: `boreding://`

## Project Classification & Approach

**Complexity Level**: Full Application — AI content generation (cloud + on-device), Gmail integration, payment, analytics with offline queue, social sharing, progressive loading, rich text rendering

**Primary User Activity**: Consuming AI-generated educational content during flight time, taking quizzes, sharing results

## User Flow

1. **Select flight** — Pick departure and arrival airports from a database of 500+ airports, or use the Gmail AI Agent to auto-detect an upcoming flight from booking confirmation emails.
2. **Adjust content duration** — Slider lets users choose how much of their flight time to fill with reading (0–100% of estimated flight time, defaults to 80%).
3. **Choose topic** — Optionally specify a learning topic (e.g., "Machine Learning", "Guitar basics"); defaults to destination city knowledge. Topics are validated by AI to ensure they're meaningful.
4. **Generate content** — AI generates sections in batches of 4. The first batch displays on a loading screen with animated airplane SVG, a "Loading content…" label, rotating flight facts, and a section checklist. Once the first batch is ready, the user is navigated to the content reader immediately.
5. **Read sections** — Expandable section cards with rich markdown rendering (bold, italic, headings, lists), sticky floating headers with scroll progress indicators, estimated reading times, and automatic completion marking. Remaining sections continue generating in the background with a pulsing "Writing…" indicator.
6. **Offline model nudge** — After completing the first section, the app suggests downloading an offline model for future flights (shown once).
7. **Take quiz** — 5 AI-generated multiple-choice questions based on the content read. Quiz generation begins concurrently with the last content batch.
8. **Share results** — Screenshot-based sharing to Instagram, Twitter/X, WhatsApp, and native share sheet; saves results image to gallery.

## Features

### 1. AI-Powered Content Generation
- **Free**: `gemini-2.5-flash-lite`, `gemini-2.5-flash`, `gpt-4o-mini`
- **Premium**: `gemini-2.5-pro`, `gpt-4o`
- Tries models in order, falls back if transient error
- **Batched parallel generation** — Sections generated in batches of 4 (BATCH_SIZE), with all sections in a batch running concurrently via parallel LLM calls with 120-second timeout.
- **Progressive loading** — First batch triggers navigation to content reader immediately. Remaining batches generate in the background, streaming updates via a pub/sub generation manager. Sections display a pulsing "Writing…" indicator while still generating.
- **Real-time streaming progress UI** — Dedicated `GeneratingScreen` component with animated airplane SVG, 12 rotating flight facts, "Loading content…" status label, and section completion checklist.
- **Rich markdown rendering** — Content displayed with proper formatting: **bold**, *italic*, headings (H1/H2/H3), bullet lists, numbered lists, and inline callouts. No raw markdown syntax visible to the reader.
- **Up to 16 structured sections** — For destinations: Overview, Culture & People, Food & Cuisine, Must-See Attractions, Practical Tips, History & Heritage, Language & Phrases, Hidden Gems, Neighborhoods, Itineraries, Shopping & Markets, Nature & Outdoors, Nightlife & Entertainment, Festivals & Events, Etiquette & Customs, Day Trips. Sections are weighted by priority (1–4) and allocated based on available reading time.
- **Custom topic sections** — When a user specifies their own topic, AI generates appropriate section titles instead of using the destination template.
- **Topic validation** — Custom topics are validated by AI to filter gibberish/spam before generation begins. Validation is best-effort (continues even if validation LLM fails).
- **Word count management** — Target words per section calculated from estimated minutes (~200 words/minute). Minimum 400 words, maximum 2500 words per section.
- Supports **Bring Your Own Key (BYOK)** — Users can enter their own Gemini or OpenAI API key. Keys are stored securely on-device via `expo-secure-store`, never transmitted elsewhere.
- **Concurrent quiz generation** — Quiz questions begin generating in parallel with the last content batch for faster readiness.

### 2. Offline LLM Support
- **On-device AI models** — Two models available for download:
  - **SmolLM2 360M (Lite)**: ~230 MB, works on all devices. Uses `<|im_start|>` chat template.
  - **TinyLlama 1.1B (Standard)**: ~670 MB, better quality output. Uses `<|system|>` chat template.
- **Hugging Face-hosted** — GGUF-format models downloaded directly from public Hugging Face repositories. No API keys, authentication tokens, or credentials required.
- **Download management** — Uses `expo-file-system` with resumable downloads, progress tracking, cancel/pause support. Download status persisted to AsyncStorage.
- **On-device inference** — Uses `llama.rn` library (native bridge to GGML inference engine). Native-only — web shows "unavailable" message.
- **Automatic offline fallback** — AI router detects network state and automatically switches to on-device model when offline.
- **Smart nudge** — After reading first section, app suggests downloading an offline model (shown once per user, dismissal persisted).
- **Model management UI** — `OfflineModelCard` component with model selector (radio options), download button with size labels, progress bar, cancel support, delete option, and status badges.

### 3. Airport Selection & Flight Duration Estimation
- Database of **500+ international airports** (USA, Canada, UK, Europe, Scandinavia, Eastern Europe, Turkey, Middle East, Asia) with search-as-you-type supporting IATA codes, city names, and airport names (150ms debounce).
- **Automatic flight duration estimation** based on great-circle distance (Haversine formula) between airports.
- **Content duration slider** — Adjustable from 0–100% of estimated flight time (snaps to 5% increments, defaults to 80%). Minimum 15 minutes required for generation.
- Real-time formatting of estimated duration (e.g., "2h 30m").

### 4. Gmail AI Agent (Auto-Detect Flights)
- **Google OAuth sign-in** — Cross-platform: web popup flow vs native `expo-auth-session/providers/google` with Android Client ID (SHA-1 certificate verification). Uses authorization code flow with PKCE (Google's required secure flow for mobile apps).
- **Email scanning** — Scans recent Gmail for flight booking confirmation emails.
- **Promotional email filtering** — Keyword heuristics with blacklist (offer, sale, discount, deal, cheap flight, limited time) and whitelist (booking ID, confirmation, itinerary, ticket number). If 2+ confirmation keywords present, classified as NOT promotional.
- **Multi-strategy route extraction**:
  1. Explicit patterns: "Depart: NYC → Arrive: LAX"
  2. IATA code extraction: "JFK to LAX"
  3. City name matching: "New York to Los Angeles"
  4. Arrow patterns: "JFK ⟶ LAX"
  5. Fallback: Contextual role classification from surrounding text
- **Date extraction** — Supports ISO (2024-03-17), DMY (17 Mar 2024), MDY (Mar 17, 2024).
- **Airport resolution** — Direct IATA lookup, city name fuzzy matching, or first search result fallback.
- Only flight-related emails are read; no data stored server-side.
- Gmail OAuth tokens persisted in SecureStore for session continuity.

### 5. Content Reader
- **Expandable section cards** — Each section is a collapsible card showing icon emoji, title, estimated reading time, and content preview. Cards display status badges: "Writing" (with pulsing dot) for pending, "Done" (green) for completed.
- **Sticky section headers** — When scrolling within an expanded section, a floating header appears at the top with section icon, title, and an animated horizontal progress bar. Tap to collapse.
- **Rich markdown rendering** — Custom parser converts markdown syntax to styled React Native `<Text>` components: bold, italic, headers (H1/H2/H3), bullet lists, numbered lists. Includes styled callout blocks: 💡 **Pro Tip** (amber left border) and 🤔 **Did You Know** / 🎲 **Fun Fact** (blue left border).
- **High-water-mark progress** — Progress bars track the maximum scroll depth reached per section (never decrease). Progress calculated from absolute viewport position relative to content.
- **Auto-completion at 95%** — Sections automatically marked complete when 95% scrolled.
- **Scroll-to-section-top** — Expanding a section scrolls it to the top of the viewport. Collapsing saves the scroll offset; re-expanding restores the exact reading position (position memory per section).
- **Consistent back navigation** — Uses `router.replace('/')` (not `router.back()`) with `animationTypeForReplace: 'push'` for consistent right-to-left slide animation.
- **Progress ring** — Header shows overall completion percentage. Color transitions from sky blue (in progress) to emerald green (all complete).
- **Section counter** — Shows "5/8" style progress.
- **Coverage badge** — Displays what percentage of flight time the reading covers.
- **Pulsing "Writing…" indicator** — Sections still generating show a pulsing dot animation.
- **Offline persistence** — Generated content stored in AsyncStorage, readable without network.
- **Icon mapping** — Emoji-based visual language (globe, users, fork-knife, map-pin, etc.) for each section type.

### 6. Interactive Knowledge Quiz
- 5 AI-generated multiple-choice questions drawn directly from the content the user just read.
- 4 options per question with A/B/C/D letter badges.
- Per-question answer tracking with immediate visual feedback (correct: green, wrong: red, unchosen: faded).
- Running score display: "🏆 3/5".
- Score tiers:
  - **Destination Expert** — 4–5 correct
  - **Well Prepared** — 3 correct
  - **Getting There** — 0–2 correct
- Animated transitions between questions via Reanimated.
- Sequential progression with "Next Question →" and "See Results →" CTAs.
- Option to retake the quiz after viewing results.
- Analytics tracked per question and on completion.

### 7. Social Media Sharing
- **ViewShot-based screenshot card** — Contains score, sections completed, flight route, duration, section titles, and score emoji badge (🏆/⭐/💪).
- **Save to gallery** via `expo-media-library`.
- **Instagram** — Saves screenshot, opens Instagram app for manual attachment.
- **Twitter/X** — Saves screenshot + composes pre-written post with score text and app link.
- **WhatsApp** — Pre-filled message with score.
- **Native share sheet** fallback via `expo-sharing`.
- Custom share text includes emoji, score summary, and `boreding.app` link.

### 8. Premium Upgrade (Razorpay)
- **Freemium model with token system** — Free tier uses lightweight AI models (`gemini-2.5-flash-lite`); premium unlocks better models (`gemini-2.5-pro`, `gpt-4o`) for richer content. Premium access is tracked via a token balance system.
- **Native Razorpay SDK** — In-app checkout modal via `react-native-razorpay`. No browser redirects — payment completes within the app with a direct JS callback.
- **Payment handling** — Success returns `razorpay_payment_id`; cancellation (code 2) and failures are caught separately. Post-payment: calls `markPremium()`, credits tokens, tracks analytics.
- Payment status and token balance stored locally in `expo-secure-store`.
- **Celebration animation** — Bounce-in with glow effect when user returns as premium.
- Premium badge and token status ("Premium Active" / "Premium tokens used up") displayed on home screen.

### 9. Google Analytics 4 (Measurement Protocol)
- Server-side event tracking via GA4 Measurement Protocol (no native Firebase SDK required).
- Persistent anonymous `client_id` stored in AsyncStorage (never linked to user identity).
- **Offline analytics queue** — Events queued in AsyncStorage when offline; auto-flushed when connectivity is restored.
- Development mode: Console logs all events when `__DEV__` is true.
- Events tracked:
  - `button_click` — all major button interactions
  - `route_pairing` — departure/arrival airport selections
  - `topic_selected` — custom learning topic choices
  - `generate_start` / `generate_complete` / `generate_error` — content generation lifecycle
  - `section_complete` / `all_sections_complete` — reading progress
  - `quiz_attempt` / `quiz_answer` / `quiz_complete` / `retake_quiz` — quiz engagement
  - `share_click` (method: Instagram, X, WhatsApp, native) — sharing
  - `agent_click` / `agent_scan_result` — Gmail AI agent usage
  - `upgrade_click` — premium upgrade funnel
  - `offline_generation` / `offline_model_download_start` / `offline_model_download_complete` / `offline_model_download_error` / `offline_model_deleted` — offline LLM lifecycle

### 10. Network Awareness
- **Cross-platform detection** — Web: `navigator.onLine` + window events; Native: `@react-native-community/netinfo`.
- **Real-time status** — Global `isOnline()` function with subscriber pattern for UI updates.
- **Offline banner** — Visual indicator when the device is offline.
- **Automatic routing** — AI router switches between cloud and on-device models based on network state.
- **Initialized at app startup** — `_layout.tsx` calls `initNetworkListener()` on mount.

### 11. Secure Storage
- API keys stored via `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android).
- Web fallback uses `AsyncStorage`.
- Stored items: Gmail access token, API keys (Gemini, OpenAI), Google Client ID override, premium status, payment ID.

### 12. Dark Theme UI
- Full dark theme (slate-900 `#0f172a` background, sky-400/emerald-400 accents).
- Color palette: slate (grays/neutrals), sky (primary blue), amber/orange (warm highlights), emerald (success/complete), red (error), violet (alternative accent).
- Animated rainbow gradient border on Gmail Agent button — SVG-based stroke animation using `react-native-svg` with animated `strokeDashoffset` on native; CSS keyframes on web. Two-layer system: static 40% opacity base border + bright 35% sweep rotating clockwise.
- Smooth enter animations via Reanimated (`FadeInUp`, `FadeIn`, `FadeInRight`).
- Custom airplane SVG component with gradient fills and animated flight path.
- Cross-platform slider component.
- Content-first, minimal-chrome design with generous spacing for comfortable reading.

## Architecture

### Screens (Expo Router — `app/` directory)
| Screen | File | Purpose |
|--------|------|---------|
| Home | `app/index.tsx` | Airport selection, duration slider, topic input, BYOK, Gmail agent, offline model card, upgrade CTA, generate button |
| Content Reader | `app/content.tsx` | Expandable sections with sticky headers, markdown rendering, progress ring, background generation streaming, reading time tracking, offline model nudge |
| Quiz | `app/quiz.tsx` | 5-question multiple-choice quiz with scoring and animated transitions |
| Share | `app/share.tsx` | Results card (screenshot-able), social sharing buttons (Instagram, X, WhatsApp, native) |
| Payment Success | `app/payment-success.tsx` | Razorpay deep-link callback, payment validation, premium status update |
| Layout | `app/_layout.tsx` | Root dark-theme layout, network & model initialization |

### Services (`src/services/`)
| Service | File | Purpose |
|---------|------|---------|
| AI Router | `ai-router.ts` | Gemini (primary) → OpenAI (fallback) → offline LLM (offline fallback) with BYOK support, timeout handling |
| Airports | `airports.ts` | 500+ airport database, fuzzy search, Haversine flight duration estimation |
| Analytics | `analytics.ts` | GA4 Measurement Protocol event tracking with offline queue integration |
| Content Generator | `generate.ts` | Batched parallel section generation (batch size 4), topic validation, concurrent quiz generation |
| Generation Manager | `generation-manager.ts` | Pub/sub real-time content state management for progressive loading |
| Gmail Agent | `gmail-agent.ts` | OAuth, email scanning, promotional filtering, multi-strategy route extraction |
| Google Auth | `google-auth.ts` | Cross-platform Google OAuth (web popup / native expo-auth-session) |
| Network | `network.ts` | Cross-platform network state detection with subscriber pattern |
| Offline Analytics | `offline-analytics.ts` | Analytics event queue with auto-flush on reconnection |
| Offline LLM | `offline-llm.ts` | On-device model download, management, inference via llama.rn |
| Payment | `payment.ts` | Razorpay native SDK checkout via `react-native-razorpay` with token balance management |
| Secure Storage | `secure-storage.ts` | expo-secure-store wrapper with web AsyncStorage fallback |

### Components (`src/components/`)
| Component | File | Purpose |
|-----------|------|---------|
| AirportPicker | `AirportPicker.tsx` | Search-as-you-type airport selector with debounced search and IATA badges |
| AirplaneSvg | `AirplaneSvg.tsx` | Custom airplane SVG icon with gradient fills and animated flight path |
| AnimatedGradientBorder | `AnimatedGradientBorder.tsx` | SVG-based animated rainbow gradient border (native: `react-native-svg` stroke-dash animation; web: CSS keyframes) |
| CrossPlatformSlider | `CrossPlatformSlider.tsx` | Native slider (`@react-native-community/slider`) with web HTML5 range input fallback |
| GeneratingScreen | `GeneratingScreen.tsx` | Loading screen with airplane, 12 flight facts, "Loading content…" label, section checklist |
| OfflineModelCard | `OfflineModelCard.tsx` | Offline model download/manage UI: model selector, download progress, cancel, delete, status badges |
| SectionCard | `SectionCard.tsx` | Expandable content section with scroll-based completion tracking and pulsing "Writing…" indicator |

### Other (`src/lib/`, `src/theme/`)
| File | Purpose |
|------|---------|
| `lib/types.ts` | TypeScript type definitions (Airport, ContentSection, GeneratedContent, QuizQuestion, ShareCardData, StreamState) |
| `lib/content.ts` | 16-section destination template with weighted priorities, word count allocation, batch/quiz prompt builders, response parsers |
| `theme/colors.ts` | Color palette constants (slate, sky, emerald, amber, orange, red, violet), font weights, spacing scale |

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React Native 0.79 + Expo SDK 53 |
| Routing | Expo Router 5 (file-based) |
| Language | TypeScript 5.8 |
| AI (Cloud) | Google Gemini (`@google/generative-ai` 0.24), OpenAI (raw `fetch` to chat completions API) |
| AI (On-Device) | `llama.rn` 0.4 (GGML inference for GGUF models) |
| Auth | Google OAuth via `expo-auth-session/providers/google` (native) / popup (web) |
| Payments | Razorpay native SDK (`react-native-razorpay` 2.3) |
| Analytics | GA4 Measurement Protocol (server-side HTTP) with offline queue |
| Storage | `expo-secure-store` 14.2, `@react-native-async-storage/async-storage` 2.1 |
| Animations | `react-native-reanimated` 3.17 |
| Sharing | `expo-sharing`, `react-native-view-shot` 4.0, `expo-media-library` |
| Networking | `@react-native-community/netinfo` 11.4, `expo-file-system` 18.1 |
| UI | `react-native-safe-area-context` 5.4, `react-native-screens`, `react-native-svg` 15.11, `expo-linear-gradient` 14.1 |
| Build | EAS Build (cloud), EAS Submit |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Built-in Gemini API key (fallback if user doesn't BYOK) |
| `EXPO_PUBLIC_OPENAI_API_KEY` | Built-in OpenAI API key (fallback) |
| `EXPO_PUBLIC_PREMIUM_GEMINI_API_KEY` | Premium-tier Gemini API key (higher-quota, better models for paid users) |
| `EXPO_PUBLIC_PREMIUM_OPENAI_API_KEY` | Premium-tier OpenAI API key (for paid users) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web client ID for Gmail agent |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID (tied to SHA-1 + package name) |
| `EXPO_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID |
| `EXPO_PUBLIC_GA_API_SECRET` | GA4 Measurement Protocol API secret |
| `EXPO_PUBLIC_RAZORPAY_PAYMENT_LINK` | Razorpay Payment Link URL |

## Edge Cases & Error Handling

Boreding is designed so that the user **never sees a raw error screen or stack trace**. Every error is caught, classified with a unique error code, shown as a clean message, and tracked in telemetry.

### Error Code System

All errors map to a centralized registry in `src/services/error-codes.ts`. Each code has a user-facing message, a recovery action, and is tracked as a GA4 `app_error` event.

| Code | Category | Meaning |
|------|----------|---------|  
| `E100` | Generation | AI generation failed (all providers) |
| `E101` | Generation | Topic validation failed |
| `E102` | Generation | Content parse failed |
| `E103` | Generation | Generation timeout |
| `E104` | Generation | No API key available |
| `E200` | Network | Network request failed |
| `E201` | Network | Offline with no local model |
| `E300` | Auth | Google OAuth failed |
| `E301` | Auth | Gmail scan failed |
| `E302` | Auth | OAuth token expired |
| `E400` | Payment | Payment processing failed |
| `E401` | Payment | Payment verification failed |
| `E500` | Storage | AsyncStorage read failed |
| `E501` | Storage | AsyncStorage write failed |
| `E502` | Storage | SecureStore failed |
| `E600` | Screen | Content screen load failed |
| `E601` | Screen | Quiz screen load failed |
| `E602` | Screen | Share screen load failed |
| `E603` | Screen | Component render crashed |
| `E700` | Offline model | Model download failed |
| `E701` | Offline model | Model inference failed |
| `E702` | Offline model | Model file corrupt |
| `E999` | Unknown | Unexpected error |

### Warning Codes (Non-Fatal)

Warning codes (`W8xx`) are logged when optional native modules fail to load but the app can continue with fallbacks:

| Code | Category | Meaning |
|------|----------|---------|  
| `W800` | Native module | SecureStore unavailable — falling back to AsyncStorage |
| `W801` | Native module | Native Slider unavailable — falling back to web range input |
| `W802` | Native module | GA4 analytics init failed — events will be no-ops |
| `W803` | Native module | WebBrowser.maybeCompleteAuthSession failed |
| `W804` | Native module | getBuiltinGoogleClientId failed |
| `W805` | Native module | expo-auth-session unavailable |
| `W806` | Native module | makeRedirectUri failed |
| `W807` | Native module | llama.rn unavailable — offline LLM disabled |

### Error Boundaries

Every screen is wrapped in a React `ErrorBoundary` component (`src/components/ErrorBoundary.tsx`). If a rendering crash occurs, the boundary catches it, displays a clean error card with code + message + "Try Again" button, and tracks the error in GA4.

### Recovery Behavior

- **Worst case**: User sees a clean error card with error code, message, and recovery action — never a crash screen.
- **Screen errors**: User is navigated back to the home screen.
- **Generation errors**: Fallback chain (Gemini → OpenAI → offline LLM); if all fail, show error with retry.
- **Network errors**: Attempts offline LLM fallback; partial content is preserved.
- **Storage errors**: All async storage operations are wrapped in try/catch; app degrades gracefully.
- **Payment errors**: Caught and shown with code; user stays on home screen.

### Error Telemetry

Every error fires a GA4 `app_error` event containing: `error_code`, `error_message`, `screen`, and `raw_error` (first 200 chars). This enables monitoring error frequency by code and screen in the GA4 dashboard.

### Additional Edge Cases

- **AI generation failure**: Gemini → OpenAI → offline LLM automatic fallback chain. If all fail, graceful error display with retry option.
- **Network loss mid-generation**: Attempts to continue with offline LLM (if downloaded). Partial content already generated is preserved and displayed.
- **Very short / very long flights**: Minimum 15-minute content generation. Slider allows 0–100% of flight time.
- **No API key**: Prompts user to enter BYOK. Validates key before generation.
- **Gmail agent finds no flights**: Displays "No flight details found". User can still manually select airports.
- **Promotional email filtering**: Keyword heuristics with blacklist/whitelist. If 2+ confirmation keywords present, not classified as promotional.
- **Payment link browser dismiss**: Can't detect payment status from browser return; shows confirmation dialog.
- **Offline after generation**: Content stored in AsyncStorage, readable without network.
- **Cross-platform**: Web fallbacks for SecureStore (AsyncStorage), Slider (HTML range input), Alert (window.alert). Offline LLM is native-only (web shows "unavailable").
- **JSON parse failures**: Batch content responses have fallback chunking if `---SECTION:` delimiters fail to parse.
- **Model download interruption**: Download state persisted and resumable. Checks if model file exists on startup.
- **Offline analytics**: Events queued with timestamps and auto-flushed on reconnection. Queue cleared before flush to prevent duplicates.

## Design

### Color Palette
- **Background**: Slate 900 (`#0f172a`)
- **Primary accent**: Sky 400–500 (blue, CTAs and interactive elements)
- **Success accent**: Emerald 300–500 (completion states, agent button)
- **Warm highlights**: Amber 400–600, Orange 400–500
- **Text**: White (primary), Slate 400 (secondary/hints)
- **Cards**: Slate 800 with Slate 700 borders
- **Error**: Red 400–500
- **Alternative accent**: Violet 400–500

### Animations
- `FadeInUp` / `FadeIn` / `FadeInRight` entry animations via Reanimated
- Animated rainbow gradient border on Gmail Agent button
- Pulsing dot animation for sections still generating
- Bounce-in celebration animation on premium upgrade
- Animated airplane SVG with rotating/translating flight path
- Smooth scroll progress tracking (16ms throttle) for sticky headers

### Typography
- Font weights: Regular (400), Medium (500), Semibold (600), Bold (700), Extrabold (800)
- Spacing scale: xs (4px) to 5xl (48px) in 4px increments

### Design Principles
- Dark theme throughout for comfortable reading
- Generous spacing to reduce reading fatigue
- Clear visual hierarchy: hero → form → CTA → settings
- Minimal chrome — content-first design