# Privacy Policy for Boreding

**Last Updated: March 17, 2026**

## Introduction

Boreding ("we," "our," or "the app") is a mobile application that transforms flight time into learning through AI-generated content. This Privacy Policy explains how we collect, use, and protect your information when you use the Boreding app.

By using Boreding, you agree to the collection and use of information as described in this policy.

## Information We Collect

### Information You Provide

- **API Keys (Optional):** If you use the "Bring Your Own Key" feature, your Gemini or OpenAI API keys are stored securely on your device using platform-native encrypted storage (Keychain on iOS, EncryptedSharedPreferences on Android). These keys are never transmitted to our servers — they are sent only to the respective AI provider (Google or OpenAI) to generate content.
- **Topic Preferences:** The learning topics and airports you select within the app. These selections are used solely for content generation and are not transmitted to any server other than the AI provider.

### Information Collected with Your Permission

- **Gmail Data (Optional):** If you choose to connect your Google account, the app requests read-only access to your Gmail to detect upcoming flight booking confirmations. Only emails matching flight booking patterns are scanned. The app uses keyword heuristics to filter out promotional/marketing emails before processing. Email content is processed transiently in memory on your device and is not stored permanently or transmitted to any external server beyond the AI provider for extraction parsing. You can use the app without connecting Gmail.
- **Google Profile:** If you sign in with Google, we access your email address and basic profile information solely for authentication purposes and to display your signed-in status. This information is stored only on your device.

### Information Collected Automatically

- **Anonymous Analytics:** We collect anonymous usage data through Google Analytics 4 (Measurement Protocol), including button interactions, feature usage, content generation events, quiz scores, share actions, and offline model download events. This data is associated with a randomly generated anonymous identifier — not your personal identity. When the device is offline, analytics events are queued locally and transmitted when connectivity is restored.
- **Payment Status:** If you upgrade to Premium via Razorpay, the payment confirmation ID is stored on your device to unlock premium features. Payment is processed entirely within the app via Razorpay's native SDK — no payment card or banking details are stored in the app.
- **Network State:** The app monitors your device's network connectivity status to determine whether to use cloud-based AI or on-device AI models. This state is not transmitted or stored — it is used only in real-time for routing decisions.

### Information Stored Locally on Your Device

- **Generated Content:** AI-generated reading content and quiz questions are stored in your device's local storage (AsyncStorage) so you can continue reading offline or revisit content after generation.
- **Offline AI Models:** If you choose to download an on-device AI model (e.g., SmolLM2 or TinyLlama), the model file is stored in your app's document directory. These files are downloaded directly from public Hugging Face repositories — no authentication credentials, API keys, or personal information are required or transmitted during the download. Model files remain on your device until you explicitly delete them or uninstall the app.
- **Completion State:** Your reading progress (which sections you've completed) is stored locally.
- **Preference Flags:** The app stores local flags such as whether you've dismissed the offline model download suggestion. These flags contain no personal information.

## How We Use Your Information

- **Flight Detection:** Gmail data is used solely to detect upcoming flights and pre-fill airport selections. Email content is processed in memory and discarded after extraction.
- **Content Generation:** Your selected airports, topics, and flight duration are sent to AI services (Google Gemini, OpenAI, or processed locally by the on-device model) to generate personalized learning content. When using the on-device model, no data leaves your device.
- **Analytics:** Anonymous usage data helps us understand how the app is used and improve the experience. No personally identifiable information is included in analytics events.
- **Premium Access:** Payment status is stored locally to grant access to premium AI models.
- **Network Routing:** Network state is used to automatically switch between cloud-based and on-device AI generation.

## Data Storage and Security

- **On-Device Storage:** All sensitive data (API keys, payment IDs, authentication tokens) is stored on your device using platform-native secure storage (Keychain on iOS, EncryptedSharedPreferences on Android).
- **No Server-Side Storage:** Boreding does not operate backend servers. We do not store your personal data, emails, generated content, or API keys on any server.
- **Encryption in Transit:** All network communications use HTTPS/TLS encryption, including AI API calls, analytics events, Gmail API requests, and model downloads from Hugging Face.
- **On-Device AI:** When using offline models, all AI inference happens entirely on your device. No prompts, content, or personal data are transmitted over the network.

## Third-Party Services

Boreding uses the following third-party services, each governed by their own privacy policies:

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| **Google Gemini API** | AI content generation (primary) | Learning prompts, selected topics, flight duration |
| **OpenAI API** | Fallback AI content generation | Same as Gemini (used only if Gemini is unavailable) |
| **Hugging Face** | Hosting for offline AI model files | No personal data — only standard HTTP download requests for public model files |
| **Google Gmail API** | Flight detection from emails (optional) | Read-only email access with user consent |
| **Google Analytics 4** | Anonymous usage analytics | Anonymous interaction events, randomly generated client ID |
| **Razorpay** | Payment processing for Premium upgrade | Payment is handled entirely by Razorpay's native SDK within the app; we only receive a confirmation ID |

Links to third-party privacy policies:

- Google: https://policies.google.com/privacy
- OpenAI: https://openai.com/privacy
- Hugging Face: https://huggingface.co/privacy
- Razorpay: https://razorpay.com/privacy

## Data Retention

- **On-Device Data:** Stored until you uninstall the app or clear app data.
- **Offline AI Models:** Stored on-device until you manually delete them via the app or uninstall the app.
- **Gmail Tokens:** Stored on-device for the duration of your session. You can revoke access at any time via your Google Account settings at https://myaccount.google.com/permissions.
- **Analytics Data:** Anonymous analytics data is retained by Google Analytics per their standard retention policies.
- **Offline Analytics Queue:** Events queued while offline are stored temporarily in local device storage and deleted immediately after successful transmission to Google Analytics.

## Your Rights and Choices

- **Gmail Access:** You can choose not to connect Gmail. The app works fully without it.
- **BYOK:** You can provide your own AI API keys so that AI requests go directly through your own accounts.
- **Offline Models:** Downloading an offline model is entirely optional. You can delete downloaded models at any time from within the app.
- **Revoke Google Access:** Revoke Gmail permissions at any time at https://myaccount.google.com/permissions.
- **Delete Data:** Uninstalling the app removes all locally stored data, including generated content, API keys, downloaded models, and preferences. To remove analytics data, contact us at the email below.
- **Network Control:** The app respects your device's network settings. Disabling network access will cause the app to operate in offline mode only.

## Children's Privacy

Boreding is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can take appropriate action.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Last Updated" date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.

## Contact Us

If you have questions or concerns about this Privacy Policy, please contact us at:

**Email:** boreding.app@gmail.com

---

*This privacy policy applies to the Boreding mobile application available on Google Play Store and Apple App Store.*
