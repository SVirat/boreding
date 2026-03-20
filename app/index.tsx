import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  FadeIn,
  BounceIn,
} from 'react-native-reanimated';
import Slider from '../src/components/CrossPlatformSlider';
import AnimatedGradientBorder from '../src/components/AnimatedGradientBorder';
import * as WebBrowser from 'expo-web-browser';
import { getSecure, setSecure } from '../src/services/secure-storage';
import {
  getBuiltinGoogleClientId,
  getBuiltinGoogleAndroidClientId,
  signInWithGoogleWeb,
  fetchGoogleUserEmail,
} from '../src/services/google-auth';
import { Airport, GeneratedContent, StreamState } from '../src/lib/types';
import { searchAirports, estimateFlightDuration } from '../src/services/airports';
import { generateContent } from '../src/services/generate';
import { saveApiKey, getStoredApiKey, validateApiKey } from '../src/services/ai-router';
import { openRazorpayCheckout, isPremiumUser } from '../src/services/payment';
import { hasPremiumTokens, getTokenBalance } from '../src/services/token-balance';
import {
  scanGmailForFlights,
  setAccessToken,
  clearAccessToken,
  hasAccessToken,
  loadStoredToken,
} from '../src/services/gmail-agent';
import {
  trackButtonClick,
  trackRoutePairing,
  trackTopicSelected,
  trackGenerateStart,
  trackGenerateComplete,
  trackGenerateError,
  trackUpgradeClick,
  trackAgentClick,
  trackAgentScanResult,
  trackOfflineGeneration,
  trackScreenView,
} from '../src/services/analytics';
import { isOnline, subscribeToNetwork } from '../src/services/network';
import { isModelReady, getActiveModelName, isOfflineEngineAvailable } from '../src/services/offline-llm';
import AirportPicker from '../src/components/AirportPicker';
import AirplaneSvg from '../src/components/AirplaneSvg';
import GeneratingScreen from '../src/components/GeneratingScreen';
import OfflineModelCard from '../src/components/OfflineModelCard';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { Colors } from '../src/theme/colors';
import { classifyError, getErrorMessage } from '../src/services/error-codes';
import { trackAppError } from '../src/services/analytics';

try {
  WebBrowser.maybeCompleteAuthSession();
} catch (e) {
  console.warn('[W803] maybeCompleteAuthSession failed:', e instanceof Error ? e.message : e);
}

const GOOGLE_CLIENT_ID_STORAGE_KEY = 'boreding_google_client_id';
let BUILTIN_GOOGLE_CLIENT_ID = '';
try {
  BUILTIN_GOOGLE_CLIENT_ID = getBuiltinGoogleClientId();
} catch (e) {
  console.warn('[W804] getBuiltinGoogleClientId failed:', e instanceof Error ? e.message : e);
}

let BUILTIN_GOOGLE_ANDROID_CLIENT_ID = '';
try {
  BUILTIN_GOOGLE_ANDROID_CLIENT_ID = getBuiltinGoogleAndroidClientId();
} catch (e) {
  console.warn('[W804] getBuiltinGoogleAndroidClientId failed:', e instanceof Error ? e.message : e);
}

// Cross-platform alert (Alert.alert is a no-op on web)
function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message, [{ text: 'OK' }]);
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [departure, setDeparture] = useState<Airport | null>(null);
  const [arrival, setArrival] = useState<Airport | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [contentDuration, setContentDuration] = useState<number>(30);
  const [learningTopic, setLearningTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<StreamState | null>(null);
  const [scanning, setScanning] = useState(false);
  const [agentDetected, setAgentDetected] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState(BUILTIN_GOOGLE_CLIENT_ID);
  const [googleClientIdInput, setGoogleClientIdInput] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [justUpgraded, setJustUpgraded] = useState(false);
  const [tokensExhausted, setTokensExhausted] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [moreExpanded, setMoreExpanded] = useState(false);

  // Track screen view
  useEffect(() => { trackScreenView('home'); }, []);

  // Track network connectivity
  useEffect(() => {
    setIsConnected(isOnline());
    return subscribeToNetwork(setIsConnected);
  }, []);

  // Restore persisted Gmail token and Google Client ID on mount
  useEffect(() => {
    try { loadStoredToken(); } catch {}
    isPremiumUser().then(setIsPremium).catch(() => {});
    hasPremiumTokens().then((has) => setTokensExhausted(!has)).catch(() => {});
    getSecure(GOOGLE_CLIENT_ID_STORAGE_KEY).then((id) => {
      if (id) {
        setGoogleClientId(id);
        setGoogleClientIdInput(id);
      }
    }).catch(() => {});
  }, []);

  // Re-check premium status when screen regains focus (e.g. after payment-success redirect)
  useFocusEffect(
    useCallback(() => {
      isPremiumUser().then((premium) => {
        if (premium && !isPremium) {
          setJustUpgraded(true);
          setTokensExhausted(false);
        }
        setIsPremium(premium);
        // Check if premium tokens are used up
        hasPremiumTokens().then((has) => {
          if (premium && !has) setTokensExhausted(true);
          else setTokensExhausted(false);
        }).catch(() => {});
      });
    }, [isPremium])
  );

  const durationMinutes = contentDuration;

  // ── Google OAuth ──
  // Web: uses signInWithGoogleWeb() from google-auth.ts (no hooks needed)
  // Native: uses expo-auth-session/providers/google (handles Android redirect URIs correctly)
  let GoogleAuth: any = null;
  if (Platform.OS !== 'web') {
    try {
      GoogleAuth = require('expo-auth-session/providers/google');
    } catch (e) {
      console.warn('[W805] expo-auth-session/providers/google unavailable:', e instanceof Error ? e.message : e);
    }
  }
  const [authReq, , promptGoogleAsync] = GoogleAuth?.useAuthRequest?.({
    androidClientId: BUILTIN_GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: googleClientId || undefined,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'email', 'profile'],
  }) ?? [null, null, null];

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleDepartureChange = useCallback(
    (airport: Airport) => {
      setDeparture(airport);
      if (airport && arrival) {
        const dur = estimateFlightDuration(airport.iata, arrival.iata);
        setEstimatedDuration(dur);
        setContentDuration(Math.round(dur * 0.8));
      }
    },
    [arrival]
  );

  const handleArrivalChange = useCallback(
    (airport: Airport) => {
      setArrival(airport);
      if (departure && airport) {
        const dur = estimateFlightDuration(departure.iata, airport.iata);
        setEstimatedDuration(dur);
        setContentDuration(Math.round(dur * 0.8));
      }
    },
    [departure]
  );

  const handleSaveGoogleClientId = useCallback(async () => {
    const trimmed = googleClientIdInput.trim();
    if (trimmed) {
      await setSecure(GOOGLE_CLIENT_ID_STORAGE_KEY, trimmed);
      setGoogleClientId(trimmed);
    }
  }, [googleClientIdInput]);

  const handleAgentClick = useCallback(async () => {
    trackAgentClick(hasAccessToken() ? 'authenticated' : 'unauthenticated');

    if (!googleClientId) {
      showAlert('Google Client ID Required', 'Please enter your Google OAuth Client ID below to use the Gmail agent.');
      return;
    }

    if (hasAccessToken()) {
      await performEmailScan();
      return;
    }

    try {
      let token: string | null = null;

      if (Platform.OS === 'web') {
        token = await signInWithGoogleWeb(googleClientId);
        if (!token) {
          showAlert('Sign-in Cancelled', 'Popup was blocked or closed. Please allow popups and try again.');
          return;
        }
      } else {
        // Native flow — uses Google provider which handles Android redirects via SHA-1
        if (!authReq || !promptGoogleAsync) {
          showAlert('OAuth Not Ready', 'The Google sign-in flow is still loading. Please wait a moment and try again.');
          return;
        }
        const result = await promptGoogleAsync();
        if (result?.type === 'success') {
          token = result.authentication?.accessToken ?? null;
          if (!token) {
            showAlert('Sign-in Failed', 'Could not get access token. Please try again.');
            return;
          }
        } else if (result?.type === 'error') {
          showAlert('Sign-in Failed', (result as any).error?.message || 'OAuth error');
          return;
        } else {
          return; // dismissed
        }
      }

      if (token) {
        await setAccessToken(token);
        const email = await fetchGoogleUserEmail(token);
        if (email) setSignedInEmail(email);
        await performEmailScan(token);
      }
    } catch (err) {
      const code = classifyError(err, 'auth');
      trackAppError(code, 'Sign-in failed', 'home', err instanceof Error ? err.message : String(err));
      showAlert('Sign-in Error', getErrorMessage(code));
    }
  }, [googleClientId, authReq, promptGoogleAsync]);

  const performEmailScan = async (token?: string) => {
    setScanning(true);
    setError(null);
    try {
      const result = await scanGmailForFlights(token ?? '');
      if (result.departure && result.arrival) {
        setDeparture(result.departure);
        setArrival(result.arrival);
        setAgentDetected(true);
        trackAgentScanResult(true);
        const dur = estimateFlightDuration(result.departure.iata, result.arrival.iata);
        setEstimatedDuration(dur);
        setContentDuration(Math.round(dur * 0.8));
      } else {
        trackAgentScanResult(false);
        setError(result.message || 'No flight details found in your recent emails.');
      }
    } catch (e) {
      const code = classifyError(e, 'auth');
      trackAppError(code, 'Email scan failed', 'home', e instanceof Error ? e.message : String(e));
      setError(getErrorMessage(code));
    } finally {
      setScanning(false);
    }
  };

  const handleSignOut = async () => {
    await clearAccessToken();
    setSignedInEmail(null);
  };

  const handleGenerate = async () => {
    if (!arrival || durationMinutes < 15) return;

    // Save API key if provided — but validate it first
    if (apiKey.trim()) {
      const validation = await validateApiKey(apiKey.trim());
      if (!validation.valid) {
        showAlert('Invalid API Key', validation.error || 'The API key you entered is not valid. Please check and try again.');
        return;
      }
      await saveApiKey(apiKey.trim());
    }

    // Check if API key exists (not needed when an offline model is downloaded)
    const hasOfflineModel = isModelReady();
    const storedKey = await getStoredApiKey();
    if (!hasOfflineModel && !storedKey && !apiKey.trim()) {
      showAlert('API Key Required', 'Please enter your Gemini or OpenAI API key to generate content, or download an offline model.');
      return;
    }

    // Pre-flight: if user is offline and relying on their downloaded model,
    // verify that the native engine is available before spending time generating
    if (!isConnected && hasOfflineModel && !isOfflineEngineAvailable()) {
      showAlert(
        'Offline Engine Unavailable',
        'The offline model engine (llama.rn) is not included in this build. Please connect to the internet to use cloud AI, or rebuild the app with llama.rn support. (W807)'
      );
      return;
    }

    const generationStartTime = Date.now();
    trackButtonClick('generate');
    trackGenerateStart(arrival.city, durationMinutes, !!learningTopic.trim(), !!apiKey.trim());
    if (departure && arrival) {
      trackRoutePairing(departure.iata, arrival.iata, departure.city, arrival.city);
    }
    if (learningTopic.trim()) {
      trackTopicSelected(learningTopic.trim());
    }

    setLoading(true);
    setError(null);
    setStreamState(null);

    // Track offline generation
    if (!isConnected && isModelReady()) {
      trackOfflineGeneration(arrival.city, getActiveModelName());
    }

    try {
      let navigated = false;

      // Don't await — let generation continue in background after first batch
      generateContent(
        arrival.city,
        arrival.country,
        durationMinutes,
        learningTopic.trim() || undefined,
        {
          onStreamState: setStreamState,
          onError: (msg) => setError(msg),
          onFirstBatchReady: () => {
            if (navigated) return;
            navigated = true;
            setLoading(false);
            router.push('/content');
          },
        }
      ).then((content) => {
        const loadTimeMs = Date.now() - generationStartTime;
        trackGenerateComplete(arrival.city, durationMinutes, loadTimeMs, content.sections.length);
      }).catch((e) => {
        const code = classifyError(e, 'generation');
        const msg = getErrorMessage(code);
        trackAppError(code, 'Generation failed', 'home', e instanceof Error ? e.message : String(e));
        trackGenerateError(arrival?.city ?? 'unknown', msg);
        if (!navigated) {
          setError(msg);
          setLoading(false);
        }
      });
    } catch (e) {
      const code = classifyError(e, 'generation');
      const msg = getErrorMessage(code);
      trackAppError(code, 'Generation failed', 'home', e instanceof Error ? e.message : String(e));
      trackGenerateError(arrival?.city ?? 'unknown', msg);
      setError(msg);
      setLoading(false);
    }
  };

  if (loading && streamState) {
    return (
      <GeneratingScreen
        destination={streamState.destination}
        country={streamState.country}
        topic={streamState.topic}
        totalSections={streamState.totalSections}
        sectionTitles={streamState.sectionTitles}
        completedCount={streamState.completedCount}
        currentIndex={streamState.currentIndex}
        currentTitle={streamState.currentTitle}
      />
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero */}
      <Animated.View entering={FadeInUp.duration(600)} style={styles.hero}>
        <View style={styles.heroRow}>
          <AirplaneSvg size={40} />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Boreding</Text>
            <Text style={styles.heroSubtitle}>Learn on the fly.</Text>
          </View>
        </View>
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              {isModelReady() ? '✈️ Offline — using on-device AI' : '📡 No internet connection'}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Form Card */}
      <View style={styles.formCard}>
        <AirportPicker
          label="Departing from"
          icon="departure"
          value={departure}
          onChange={handleDepartureChange}
        />

        <AirportPicker
          label="Flying to"
          icon="arrival"
          value={arrival}
            onChange={handleArrivalChange}
        />

        {/* Agent: Auto-detect from Gmail */}
        <View style={styles.agentSection}>
          <AnimatedGradientBorder
            borderWidth={1.5}
            borderRadius={12}
            colors={['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4']}
            speed={3}
            animated={!agentDetected}
          >
            <TouchableOpacity
              style={styles.agentBtn}
              onPress={handleAgentClick}
              disabled={scanning}
              activeOpacity={0.8}
            >
              {scanning ? (
                <View style={styles.agentBtnInner}>
                  <ActivityIndicator size="small" color={Colors.emerald[400]} />
                  <Text style={styles.agentBtnText}>Scanning your emails…</Text>
                </View>
              ) : hasAccessToken() ? (
                <View style={styles.agentBtnInner}>
                  <Text style={{ fontSize: 14 }}></Text>
                  <Text style={styles.agentBtnText}>Auto-detect with our AI Agent</Text>
                </View>
              ) : (
                <View style={styles.agentBtnInner}>
                  <Text style={{ fontSize: 14 }}></Text>
                  <Text style={styles.agentBtnText}>Auto-detect with our AI Agent</Text>
                </View>
              )}
            </TouchableOpacity>
          </AnimatedGradientBorder>
          {signedInEmail && (
            <View style={styles.agentSignedInRow}>
              <Text style={styles.agentSignedInText}>
                Signed in as {signedInEmail}
              </Text>
              <TouchableOpacity onPress={handleSignOut}>
                <Text style={styles.agentSignOutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.agentHint}>
            Reads only flight booking emails. No data is stored.
          </Text>
        </View>

        {/* Duration Slider */}
        {estimatedDuration != null && estimatedDuration > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Content duration</Text>
            <View style={styles.durationHeader}>
              <Text style={styles.durationIcon}>🕐</Text>
              <Text style={styles.durationFlightLabel}>
                Flight: {formatDuration(estimatedDuration)}
              </Text>
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderMinLabel}>0%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={estimatedDuration}
                step={Math.max(1, Math.round(estimatedDuration * 0.05))}
                value={contentDuration}
                onValueChange={(val) => {
                  const pct = Math.round((val / estimatedDuration) * 20) * 5;
                  const snapped = Math.round(estimatedDuration * (pct / 100));
                  setContentDuration(Math.max(Math.round(estimatedDuration * 0.05), Math.min(snapped, estimatedDuration)));
                }}
                minimumTrackTintColor={Colors.sky[500]}
                maximumTrackTintColor={Colors.slate[700]}
                thumbTintColor={Colors.sky[400]}
              />
              <Text style={styles.sliderMaxLabel}>100%</Text>
            </View>
            <View style={styles.sliderValueRow}>
              <Text style={styles.sliderValueText}>
                Generate {formatDuration(contentDuration)} of content
              </Text>
              <Text style={styles.sliderPercentText}>
                {Math.round((contentDuration / estimatedDuration) * 100)}% of flight
              </Text>
            </View>
          </View>
        )}

        {/* Learning Topic */}
        {arrival && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Learning topic <Text style={styles.optional}>(optional)</Text>
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.topicIcon}>📖</Text>
              <TextInput
                style={styles.textInput}
                value={learningTopic}
                onChangeText={setLearningTopic}
                placeholder="e.g. Machine Learning, Guitar basics…"
                placeholderTextColor={Colors.slate[500]}
              />
            </View>
            <Text style={styles.helperText}>Leave empty to learn about your destination</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateBtn,
            (!arrival || durationMinutes < 15 || loading) && styles.generateBtnDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!arrival || durationMinutes < 15 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.generateBtnText}>Generate My Guide →</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Upgrade / Premium Section */}
      {!isPremium ? (
      <View style={styles.upgradeSection}>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={async () => {
              try {
                console.log('[payment] upgrade button pressed');
                trackUpgradeClick();
                const result = await openRazorpayCheckout();
                console.log('[payment] checkout result', JSON.stringify(result));
                // Always re-check premium status after checkout — the payment
                // may have been handled via deep link (payment-success.tsx)
                // even if openRazorpayCheckout returned 'cancelled'.
                const premium = await isPremiumUser();
                console.log('[payment] isPremium after checkout:', premium);
                if (premium) {
                  setIsPremium(true);
                  setTokensExhausted(false);
                  setJustUpgraded(true);
                } else if (result.error && result.error !== 'cancelled') {
                  console.log('[payment] payment failed:', result.error);
                  trackAppError('E400', 'Payment failed', 'home', result.error);
                  showAlert('Payment Failed', getErrorMessage('E400'));
                }
              } catch (e) {
                const code = classifyError(e, 'payment');
                trackAppError(code, 'Payment error', 'home', e instanceof Error ? e.message : String(e));
                showAlert('Payment Error', getErrorMessage(code));
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeBtnText}>Upgrade for better lessons</Text>
          </TouchableOpacity>
          <Text style={styles.upgradeHint}>
            We use the cheapest versions of Gemini, OpenAI, and Claude. Upgrade for better AI models.
          </Text>
      </View>
      ) : (
      <View style={styles.upgradeSection}>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>💎 Premium Active</Text>
          </View>
          {tokensExhausted && !justUpgraded && (
            <View style={styles.tokensExhaustedNotice}>
              <Text style={styles.tokensExhaustedText}>
                Premium tokens used up. Upgrade again to keep using better models.
              </Text>
              <TouchableOpacity
                style={styles.reupgradeBtn}
                onPress={async () => {
                  try {
                    trackUpgradeClick();
                    const result = await openRazorpayCheckout();
                    if (result.success) {
                      const premium = await isPremiumUser();
                      if (premium) {
                        setIsPremium(true);
                        setTokensExhausted(false);
                        setJustUpgraded(true);
                      }
                    }
                  } catch (e) {
                    const code = classifyError(e, 'payment');
                    trackAppError(code, 'Payment error', 'home', e instanceof Error ? e.message : String(e));
                    showAlert('Payment Error', getErrorMessage(code));
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.reupgradeBtnText}>Upgrade Again</Text>
              </TouchableOpacity>
            </View>
          )}
      </View>
      )}

      {/* More Options Toggle */}
      <TouchableOpacity
        style={styles.moreToggle}
        onPress={() => setMoreExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.moreToggleLine} />
        <Text style={styles.moreToggleText}>
          ⚙️ {moreExpanded ? 'Less options' : 'More options'}
        </Text>
        <Text style={styles.moreToggleChevron}>{moreExpanded ? '▲' : '▼'}</Text>
        <View style={styles.moreToggleLine} />
      </TouchableOpacity>

      {moreExpanded && (
        <View style={styles.moreSection}>
          {/* Offline Model */}
          <OfflineModelCard isConnected={isConnected} />

          {/* API Key */}
          <View style={styles.apiKeySection}>
            <Text style={styles.fieldLabel}>
              Bring Your Own Key <Text style={styles.optional}>(optional)</Text>
            </Text>
            <View style={styles.inputRow}>
              <Text style={{ fontSize: 16, marginRight: 8, alignSelf: 'flex-start', marginTop: 10 }}>🔑</Text>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.textInput}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="Enter your Gemini, OpenAI, or Claude API key"
                  placeholderTextColor={Colors.slate[500]}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.apiKeyHint}>
                  We never store your API key. Not at runtime, not at rest.
                </Text>
              </View>
            </View>
          </View>

          {/* How it works */}
          <View style={styles.howItWorks}>
            <Text style={styles.howItWorksTitle}>ℹ️ How it works</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Select your flight</Text>
              <Text style={styles.bulletItem}>• Choose what to learn about (defaults to your destination)</Text>
              <Text style={styles.bulletItem}>• We use generative AI to create curated content</Text>
              <Text style={styles.bulletItem}>• Share your learnings on social media!</Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  hero: {
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroText: {
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.slate[400],
    marginTop: 2,
  },
  offlineBanner: {
    marginTop: 10,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.2)',
  },
  offlineBannerText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.orange[400],
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    padding: 16,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.slate[400],
  },
  optional: {
    color: Colors.slate[600],
    fontWeight: '400',
  },
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  durationIcon: {
    fontSize: 16,
  },
  durationFlightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate[300],
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slider: {
    flex: 1,
    height: 24,
  },
  sliderMinLabel: {
    fontSize: 10,
    color: Colors.slate[500],
    textAlign: 'right',
  },
  sliderMaxLabel: {
    fontSize: 10,
    color: Colors.slate[500],
    minWidth: 36,
    textAlign: 'right',
  },
  sliderValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sliderValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.sky[400],
  },
  sliderPercentText: {
    fontSize: 11,
    color: Colors.slate[500],
  },
  agentSection: {
    paddingTop: 2,
  },
  agentBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 10.5,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  agentBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  agentBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.slate[300],
  },
  agentSignedInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  agentSignedInText: {
    fontSize: 10,
    color: Colors.slate[500],
  },
  agentSignOutText: {
    fontSize: 10,
    color: Colors.slate[600],
  },
  agentHint: {
    fontSize: 10,
    color: Colors.slate[600],
    marginTop: 4,
    paddingHorizontal: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.5)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.slate[200],
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    fontSize: 13,
    color: Colors.red[400],
  },
  generateBtn: {
    backgroundColor: Colors.sky[500],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: Colors.slate[700],
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  upgradeSection: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    padding: 16,
    alignItems: 'stretch',
  },
  upgradeBtn: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 148, 90, 0.5)',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(180, 148, 90, 0.08)',
  },
  upgradeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgb(200, 170, 110)',
  },
  upgradeHint: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 10,
    lineHeight: 16,
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  premiumBadge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.06)',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  premiumBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.emerald[400],
  },
  tokensExhaustedNotice: {
    marginTop: 10,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  tokensExhaustedText: {
    fontSize: 12,
    color: '#eab308',
    textAlign: 'center',
    lineHeight: 18,
  },
  reupgradeBtn: {
    marginTop: 8,
    backgroundColor: Colors.sky[600],
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  reupgradeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 10,
  },
  moreToggleLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
  },
  moreToggleText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.slate[500],
  },
  moreToggleChevron: {
    fontSize: 8,
    color: Colors.slate[600],
  },
  moreSection: {
    gap: 0,
    paddingTop: 4,
  },
  apiKeySection: {
    marginTop: 28,
    gap: 6,
  },
  apiKeyHint: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 6,
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate[300],
    marginBottom: 4,
  },
  howItWorks: {
    marginTop: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    padding: 14,
    marginBottom: 20,
  },
  howItWorksTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate[400],
    marginBottom: 8,
  },
  bulletList: {
    gap: 4,
  },
  bulletItem: {
    fontSize: 11,
    color: Colors.slate[500],
    lineHeight: 18,
    paddingLeft: 4,
  },
});
