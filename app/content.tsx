import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContentSection, GeneratedContent, ShareCardData } from '../src/lib/types';
import SectionCard from '../src/components/SectionCard';
import {
  trackSectionComplete,
  trackAllSectionsComplete,
  trackButtonClick,
  trackQuizAttempt,
  trackScreenView,
} from '../src/services/analytics';
import { shouldShowOfflineNudge, dismissOfflineNudge } from '../src/services/offline-llm';
import {
  subscribeToGeneration,
  getCurrentContent,
  isStillGenerating,
} from '../src/services/generation-manager';
import { Colors } from '../src/theme/colors';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { classifyError, getErrorMessage } from '../src/services/error-codes';
import { trackAppError } from '../src/services/analytics';

const CONTENT_STORAGE_KEY = 'boreding_last_content';

const ICON_MAP: Record<string, string> = {
  globe: '🌍',
  users: '👥',
  'fork-knife': '🍴',
  'map-pin': '📍',
  lightbulb: '💡',
  clock: '🕐',
  chat: '💬',
  sparkle: '✨',
};

export default function ContentScreen() {
  return (
    <ErrorBoundary screen="content" onReset={() => {}}>
      <ContentScreenInner />
    </ErrorBoundary>
  );
}

function ContentScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [stillGenerating, setStillGenerating] = useState(false);
  const [showOfflineNudge, setShowOfflineNudge] = useState(false);
  const [nudgeChecked, setNudgeChecked] = useState(false);
  const completedByUser = useRef<Set<string>>(new Set());

  // Expanded section tracking
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedScrollProgress, setExpandedScrollProgress] = useState(0);
  const autoCompletedRef = useRef<Set<string>>(new Set());
  const expandBaselineRef = useRef<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionMemoryOffset = useRef<Record<string, number>>({});
  const sectionMaxProgress = useRef<Record<string, number>>({});

  // Sticky header tracking
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollOffsetRef = useRef(0);
  const sectionYPositions = useRef<Record<string, number>>({});
  const sectionContentHeights = useRef<Record<string, number>>({});
  const sectionsListY = useRef(0);
  const headerHeight = useRef(0);
  const viewportHeight = useRef(0);

  useEffect(() => { trackScreenView('content'); }, []);

  useEffect(() => {
    // Try generation manager first (progressive loading)
    const managerContent = getCurrentContent();
    if (managerContent) {
      setContent(managerContent);
      setSections(managerContent.sections);
      setStillGenerating(isStillGenerating());
    } else {
      // Fallback: load from storage (e.g., revisiting content screen later)
      const loadContent = async () => {
        try {
          const stored = await AsyncStorage.getItem(CONTENT_STORAGE_KEY);
          if (stored) {
            const parsed: GeneratedContent = JSON.parse(stored);
            setContent(parsed);
            setSections(parsed.sections);
          } else {
            router.replace('/');
          }
        } catch (e) {
          trackAppError('E600', 'Content load failed', 'content', e instanceof Error ? e.message : String(e));
          router.replace('/');
        }
      };
      loadContent();
    }

    // Subscribe to generation updates for progressive loading
    const unsubscribe = subscribeToGeneration((updated) => {
      setContent(updated);
      // Merge: preserve user's completed state for sections they already read
      setSections((prev) => {
        return updated.sections.map((newSection) => {
          if (completedByUser.current.has(newSection.id)) {
            return { ...newSection, completed: true };
          }
          const existing = prev.find((s) => s.id === newSection.id);
          if (existing?.completed) {
            return { ...newSection, completed: true };
          }
          return newSection;
        });
      });
      setStillGenerating(isStillGenerating());

      // Persist latest to AsyncStorage for future visits
      AsyncStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    });

    return unsubscribe;
  }, [router]);

  // Check nudge eligibility once on mount
  useEffect(() => {
    shouldShowOfflineNudge().then((show) => {
      setNudgeChecked(true);
      if (show) setShowOfflineNudge(true);
    }).catch(() => { setNudgeChecked(true); });
  }, []);

  const readySections = sections.filter((s) => s.content !== '');
  const completedCount = sections.filter((s) => s.completed).length;

  // Show nudge after first section completion
  const nudgeVisible = showOfflineNudge && nudgeChecked && completedCount >= 1;
  const progressPercent = readySections.length > 0 ? Math.round((completedCount / readySections.length) * 100) : 0;
  const allCompleted = readySections.length > 0 && completedCount === readySections.length && !stillGenerating;
  const actualReadingMinutes = sections.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const coveragePercent = content
    ? Math.min(100, Math.round((actualReadingMinutes / content.flightDuration) * 100))
    : 0;

  const markComplete = useCallback((id: string) => {
    completedByUser.current.add(id);
    setSections((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, completed: true } : s));
      const newCompleted = updated.filter((s) => s.completed).length;
      const section = updated.find((s) => s.id === id);
      if (section) {
        trackSectionComplete(updated.indexOf(section), section.title, newCompleted, updated.length);
      }
      if (newCompleted === updated.length) {
        trackAllSectionsComplete(updated.length);
      }
      return updated;
    });
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpandedId((prev) => {
      if (prev === id) {
        // Collapsing: remember scroll offset relative to section top
        const relY = sectionYPositions.current[id];
        if (relY !== undefined) {
          const cardY = sectionsListY.current + relY;
          sectionMemoryOffset.current[id] = scrollOffsetRef.current - cardY;
        }
        expandBaselineRef.current = null;
        return null;
      }
      setExpandedScrollProgress(sectionMaxProgress.current[id] ?? 0);
      expandBaselineRef.current = null;

      // After React lays out the expanded content, scroll to section top
      requestAnimationFrame(() => {
        setTimeout(() => {
          const relY = sectionYPositions.current[id];
          if (relY !== undefined && scrollViewRef.current) {
            const cardY = sectionsListY.current + relY;
            const remembered = sectionMemoryOffset.current[id];
            const targetY = remembered !== undefined ? cardY + remembered : cardY;
            scrollViewRef.current.scrollTo({ y: Math.max(0, targetY), animated: false });
          }
        }, 100);
      });

      return id;
    });
  }, []);

  const handleOuterScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const layoutHeight = e.nativeEvent.layoutMeasurement.height;
      scrollOffsetRef.current = offsetY;
      viewportHeight.current = layoutHeight;

      if (!expandedId) {
        setShowStickyHeader(false);
        return;
      }

      const relativeY = sectionYPositions.current[expandedId];
      if (relativeY === undefined) {
        setShowStickyHeader(false);
        return;
      }

      // Absolute Y within ScrollView content
      const cardY = sectionsListY.current + relativeY;
      // Card header is ~50px; content starts after it
      const contentStartY = cardY + 50;
      const contentH = sectionContentHeights.current[expandedId] || 0;

      // Show sticky header when the card's header has scrolled past the top
      setShowStickyHeader(offsetY > cardY);

      // Calculate how much of the content the user has scrolled through
      if (contentH > 0) {
        // Absolute progress: how much content has passed through the viewport
        const viewportBottom = offsetY + layoutHeight;
        const scrolled = viewportBottom - contentStartY;
        const pct = Math.min(100, Math.max(0, Math.round((scrolled / contentH) * 100)));
        const prevMax = sectionMaxProgress.current[expandedId] ?? 0;
        const newMax = Math.max(prevMax, pct);
        sectionMaxProgress.current[expandedId] = newMax;
        setExpandedScrollProgress(newMax);

        // Auto-mark complete at >95%
        if (newMax >= 95 && !autoCompletedRef.current.has(expandedId)) {
          autoCompletedRef.current.add(expandedId);
          markComplete(expandedId);
        }
      }
    },
    [expandedId, markComplete]
  );

  const handleSectionLayout = useCallback(
    (id: string, e: LayoutChangeEvent) => {
      sectionYPositions.current[id] = e.nativeEvent.layout.y;
    },
    []
  );

  const handleContentHeight = useCallback(
    (id: string, height: number) => {
      sectionContentHeights.current[id] = height;
    },
    []
  );

  const handleSectionsListLayout = useCallback((e: LayoutChangeEvent) => {
    sectionsListY.current = e.nativeEvent.layout.y;
  }, []);

  const handleHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    headerHeight.current = e.nativeEvent.layout.height;
  }, []);

  const expandedSection = expandedId ? sections.find((s) => s.id === expandedId) : null;

  const handleStartQuiz = async () => {
    if (!content) return;
    trackButtonClick('start_quiz');
    trackQuizAttempt(content.topic || content.destination);

    try {
      // Pass quiz data through storage
      await AsyncStorage.setItem(
        'boreding_quiz_data',
        JSON.stringify({
          destination: content.destination,
          country: content.country,
          questions: content.quizQuestions ?? [],
          topic: content.topic,
        })
      );
      router.push('/quiz');
    } catch (e) {
      trackAppError('E501', 'Failed to save quiz data', 'content', e instanceof Error ? e.message : String(e));
      router.push('/quiz');
    }
  };

  if (!content) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* App Header */}
      <View style={styles.header} onLayout={handleHeaderLayout}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'← Back'}</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerLogo}>{'✈️ Boreding'}</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.progressText}>
            {completedCount}/{readySections.length}
          </Text>
          <View style={styles.progressRing}>
            <Text style={[styles.progressPercent, { color: allCompleted ? Colors.emerald[400] : Colors.sky[400] }]}>
              {progressPercent}%
            </Text>
          </View>
        </View>
      </View>

      {/* Floating sticky section header */}
      {showStickyHeader && expandedSection && (
        <TouchableOpacity
          style={styles.stickyHeader}
          onPress={() => toggleSection(expandedSection.id)}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.stickyIconBox,
              expandedSection.completed ? styles.stickyIconBoxCompleted : styles.stickyIconBoxDefault,
            ]}
          >
            <Text style={{ fontSize: 12 }}>
              {expandedSection.completed ? '✅' : (ICON_MAP[expandedSection.icon] || '🌍')}
            </Text>
          </View>
          <Text style={styles.stickyTitle} numberOfLines={1}>{expandedSection.title}</Text>
          {expandedSection.completed && (
            <Text style={styles.stickyDone}>Done</Text>
          )}
          <Text style={styles.stickyChevron}>{'▲'}</Text>
          {/* Progress bar */}
          <View style={styles.stickyProgressBar}>
            <View
              style={[
                styles.stickyProgressFill,
                {
                  width: `${expandedSection.completed ? 100 : expandedScrollProgress}%`,
                  backgroundColor: expandedSection.completed ? Colors.emerald[400] : Colors.emerald[400],
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleOuterScroll}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <Animated.View entering={FadeInUp.duration(500)} style={styles.heroSection}>
          <Text style={styles.heroLabel}>
            {content.topic ? 'Learning about' : 'Your guide to'}
          </Text>
          <Text style={styles.heroTitle}>{content.topic || content.destination}</Text>
          <View style={styles.heroMeta}>
            {!content.topic && (
              <>
                <Text style={styles.metaText}>{content.country}</Text>
                <Text style={styles.metaDot}>·</Text>
              </>
            )}
            <Text style={styles.metaText}>
              {Math.floor(content.flightDuration / 60)}h {content.flightDuration % 60}m flight
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{actualReadingMinutes} min read</Text>
            <View style={styles.coverageBadge}>
              <Text style={styles.coverageText}>{coveragePercent}% covered</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: allCompleted ? Colors.emerald[400] : Colors.sky[400],
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {allCompleted ? 'All sections complete — take the quiz!' : `${progressPercent}% complete`}
          </Text>
        </Animated.View>

        {/* Section Cards */}
        <View style={styles.sectionsList} onLayout={handleSectionsListLayout}>
          {sections.map((section, idx) => (
            <View
              key={section.id}
              onLayout={(e) => handleSectionLayout(section.id, e)}
            >
              <SectionCard
                section={section}
                index={idx}
                onMarkComplete={markComplete}
                pending={section.content === ''}
                expanded={expandedId === section.id}
                onToggle={() => toggleSection(section.id)}
                scrollProgress={expandedId === section.id ? expandedScrollProgress : 0}
                onContentHeight={(h) => handleContentHeight(section.id, h)}
              />
            </View>
          ))}

          {/* Offline nudge — appears after first section read */}
          {nudgeVisible && (
            <Animated.View entering={FadeInDown.duration(400).delay(300)} exiting={FadeOut.duration(300)} style={styles.offlineNudge}>
              <View style={styles.nudgeHeader}>
                <Text style={styles.nudgeIcon}>✈️</Text>
                <Text style={styles.nudgeTitle}>Reading this on a flight?</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowOfflineNudge(false);
                    dismissOfflineNudge();
                    trackButtonClick('offline_nudge_dismiss');
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.nudgeDismiss}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.nudgeBody}>
                Download a small AI model so you can generate guides without WiFi — perfect for your next flight.
              </Text>
              <TouchableOpacity
                style={styles.nudgeBtn}
                onPress={() => {
                  setShowOfflineNudge(false);
                  dismissOfflineNudge();
                  trackButtonClick('offline_nudge_download');
                  router.replace('/');
                  // The OfflineModelCard on the home screen handles the download
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.nudgeBtnText}>Set up offline mode</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Quiz CTA */}
          {allCompleted && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.quizCta}>
              <Text style={styles.quizEmoji}>🎉</Text>
              <Text style={styles.quizTitle}>
                {content.topic
                  ? `You've mastered ${content.topic}!`
                  : `Ready to explore ${content.destination}!`}
              </Text>
              <Text style={styles.quizSubtitle}>Test your knowledge with a quick quiz.</Text>
              <TouchableOpacity style={styles.quizBtn} onPress={handleStartQuiz} activeOpacity={0.8}>
                <Text style={styles.quizBtnText}>🏆 Take the Quiz</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingText: {
    color: Colors.slate[400],
    fontSize: 14,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.97)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14, 165, 233, 0.2)',
  },
  stickyIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyIconBoxDefault: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  stickyIconBoxCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  stickyTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate[200],
  },
  stickyProgress: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.sky[400],
  },
  stickyDone: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.emerald[400],
  },
  stickyChevron: {
    fontSize: 10,
    color: Colors.slate[500],
  },
  stickyProgressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
  },
  stickyProgressFill: {
    height: '100%',
    borderRadius: 1,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    color: Colors.slate[400],
    fontSize: 14,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLogo: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate[200],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 11,
    color: Colors.slate[400],
  },
  progressRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.sky[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 8,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  heroSection: {
    paddingTop: 28,
    paddingBottom: 20,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.sky[400],
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.slate[400],
  },
  metaDot: {
    color: Colors.slate[600],
    fontSize: 13,
  },
  coverageBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  coverageText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.sky[400],
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 6,
  },
  sectionsList: {
    gap: 10,
    paddingBottom: 20,
  },
  quizCta: {
    marginTop: 12,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
  },
  quizEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  quizSubtitle: {
    fontSize: 13,
    color: Colors.slate[400],
    marginBottom: 16,
  },
  quizBtn: {
    backgroundColor: Colors.amber[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  quizBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  offlineNudge: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  nudgeIcon: {
    fontSize: 16,
  },
  nudgeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate[200],
    flex: 1,
  },
  nudgeDismiss: {
    fontSize: 14,
    color: Colors.slate[500],
    paddingLeft: 4,
  },
  nudgeBody: {
    fontSize: 12,
    color: Colors.slate[400],
    lineHeight: 18,
    marginBottom: 10,
  },
  nudgeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  nudgeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sky[400],
  },
});
