import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  FadeIn,
  FadeInRight,
  FadeOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AirplaneSvg from './AirplaneSvg';
import { Colors } from '../theme/colors';

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

const FUN_FACTS = [
  { text: 'The longest non-stop flight is over 18 hours', icon: '✈️' },
  { text: 'Airplane food tastes bland because your taste buds dull at altitude', icon: '🍽️' },
  { text: 'Pilots and co-pilots eat different meals to avoid food poisoning', icon: '👨‍✈️' },
  { text: 'The Wright Brothers\u2019 first flight was shorter than a Boeing 747', icon: '📏' },
  { text: 'You lose about 1.5 liters of water during a 3-hour flight', icon: '💧' },
  { text: 'Lightning strikes every commercial plane roughly once a year', icon: '⚡' },
  { text: 'The cabin air is completely refreshed every 2\u20133 minutes', icon: '🌬️' },
  { text: 'About 80% of plane crashes happen in the first 3 or last 8 minutes', icon: '📊' },
  { text: 'The world\u2019s busiest airport serves over 90 million passengers a year', icon: '🏢' },
  { text: 'In-flight Wi-Fi works via satellites orbiting 35,000 km above Earth', icon: '📡' },
  { text: 'A plane\u2019s black box is actually bright orange', icon: '🟠' },
  { text: 'The average cruising speed of a Boeing 747 is 575 mph', icon: '🚀' },
];

interface SectionInfo {
  id: string;
  title: string;
  icon: string;
}

interface GeneratingScreenProps {
  destination: string;
  country: string;
  topic?: string;
  totalSections: number;
  sectionTitles: SectionInfo[];
  completedCount: number;
  currentIndex: number;
  currentTitle: string;
}

function PulsingDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.sky[400] }, style]} />
  );
}

// Rough estimate: ~4s per section in the first batch (4 sections generated in one API call)
const FIRST_BATCH_SIZE = 4;

export default function GeneratingScreen({
  destination,
  country,
  topic,
  totalSections,
  sectionTitles,
  completedCount,
}: GeneratingScreenProps) {
  const insets = useSafeAreaInsets();
  const displaySubject = topic || `${destination}, ${country}`;

  // Rotating fun facts
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * FUN_FACTS.length));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const currentFact = FUN_FACTS[factIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      {/* Airplane */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.airplane}>
        <AirplaneSvg size={64} />
      </Animated.View>

      {/* Heading */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.heading}>
        <Text style={styles.headingLabel}>Preparing your guide to</Text>
        <Text style={styles.headingTitle}>{displaySubject}</Text>
      </Animated.View>

      {/* Time estimate */}
      <Animated.View entering={FadeInUp.delay(250)} style={styles.estimateRow}>
        <Text style={styles.estimateText}>Loading content…</Text>
      </Animated.View>

      {/* Fun fact ticker */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.factCard}>
        <Animated.View
          key={factIndex}
          entering={FadeInRight.duration(400)}
          exiting={FadeOutLeft.duration(300)}
          style={styles.factInner}
        >
          <Text style={styles.factIcon}>{currentFact.icon}</Text>
          <Text style={styles.factText}>{currentFact.text}</Text>
        </Animated.View>
      </Animated.View>

      {/* Section list */}
      <Animated.View entering={FadeInUp.delay(350)} style={styles.sectionList}>
        {sectionTitles.map((section, i) => {
          const isCompleted = i < completedCount;
          const isCurrent = i === completedCount && i < totalSections;
          const icon = ICON_MAP[section.icon] || '🌍';

          return (
            <Animated.View
              key={section.id}
              entering={FadeInUp.delay(350 + i * 50)}
              style={[
                styles.sectionRow,
                isCompleted && styles.sectionRowCompleted,
                isCurrent && styles.sectionRowCurrent,
                !isCompleted && !isCurrent && styles.sectionRowPending,
              ]}
            >
              <Text style={{ fontSize: 14 }}>
                {isCompleted ? '✅' : isCurrent ? '⏳' : '○'}
              </Text>
              <Text style={{ fontSize: 14 }}>{icon}</Text>
              <Text
                style={[
                  styles.sectionName,
                  isCompleted && { color: Colors.slate[400] },
                  isCurrent && { color: Colors.slate[200] },
                  !isCompleted && !isCurrent && { color: Colors.slate[600] },
                ]}
                numberOfLines={1}
              >
                {section.title}
              </Text>
              {isCurrent && (
                <View style={styles.writingContainer}>
                  <PulsingDot />
                  <Text style={styles.writingLabel}>Writing</Text>
                </View>
              )}
              {isCompleted && (
                <Text style={styles.doneLabel}>Done</Text>
              )}
            </Animated.View>
          );
        })}
      </Animated.View>

      <Text style={styles.footer}>Your personalized guide is being crafted by AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  airplane: {
    marginBottom: 24,
  },
  heading: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headingLabel: {
    fontSize: 14,
    color: Colors.slate[400],
    marginBottom: 4,
  },
  headingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  factCard: {
    width: '100%',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    minHeight: 44,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  factInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factIcon: {
    fontSize: 16,
  },
  factText: {
    flex: 1,
    fontSize: 12,
    color: Colors.sky[200],
    fontStyle: 'italic',
    lineHeight: 17,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  estimateText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.sky[400],
  },
  sectionList: {
    width: '100%',
    gap: 6,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  sectionRowCompleted: {
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderColor: 'rgba(14, 165, 233, 0.15)',
  },
  sectionRowCurrent: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  sectionRowPending: {
    borderColor: 'transparent',
    opacity: 0.4,
  },
  sectionName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  writingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  writingLabel: {
    fontSize: 10,
    color: Colors.sky[400],
    fontWeight: '500',
  },
  doneLabel: {
    fontSize: 10,
    color: 'rgba(14, 165, 233, 0.6)',
    fontWeight: '500',
  },
  footer: {
    marginTop: 28,
    fontSize: 11,
    color: Colors.slate[600],
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
