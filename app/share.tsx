import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { trackShareClick, trackRetakeQuiz, trackScreenView } from '../src/services/analytics';
import { Colors } from '../src/theme/colors';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { trackAppError } from '../src/services/analytics';

interface ShareData {
  destination: string;
  country: string;
  quizScore: number;
  quizTotal: number;
  topic?: string;
}

export default function ShareScreen() {
  const router = useRouter();
  return (
    <ErrorBoundary screen="share" onReset={() => router.replace('/')}>
      <ShareScreenInner />
    </ErrorBoundary>
  );
}

function ShareScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<ViewShot>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [contentData, setContentData] = useState<{
    flightDuration: number;
    sectionsCompleted: number;
    totalSections: number;
    sectionTitles: string[];
  } | null>(null);

  useEffect(() => {
    trackScreenView('share');
    const loadData = async () => {
      try {
        const shareStr = await AsyncStorage.getItem('boreding_share_data');
        const contentStr = await AsyncStorage.getItem('boreding_last_content');
        if (shareStr) {
          setData(JSON.parse(shareStr));
        }
        if (contentStr) {
          const content = JSON.parse(contentStr);
          setContentData({
            flightDuration: content.flightDuration,
            sectionsCompleted: content.sections.length,
            totalSections: content.sections.length,
            sectionTitles: content.sections.map((s: { title: string }) => s.title),
          });
        }
      } catch (e) {
        trackAppError('E602', 'Share data load failed', 'share', e instanceof Error ? e.message : String(e));
      }
    };
    loadData();
  }, []);

  const scoreEmoji = data && data.quizScore >= 4 ? '🏆' : data && data.quizScore >= 3 ? '⭐' : '💪';
  const scoreLabel = data && data.quizScore >= 4 ? 'Destination Expert' : data && data.quizScore >= 3 ? 'Well Prepared' : 'Getting There';

  const saveScreenshotToGallery = useCallback(async (): Promise<string | null> => {
    if (!viewShotRef.current?.capture) return null;
    try {
      const uri = await viewShotRef.current.capture();
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save the screenshot to your gallery.');
        return null;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      return uri;
    } catch (err) {
      console.error('Save screenshot failed:', err);
      return null;
    }
  }, []);

  const getShareText = useCallback(() => {
    if (!data || !contentData) return '';
    return `${scoreEmoji} I just learned everything about ${data.destination} on my ${Math.floor(contentData.flightDuration / 60)}h flight using Boreding!\n\n📖 ${contentData.sectionsCompleted}/${contentData.totalSections} sections completed\n🎯 Quiz: ${data.quizScore}/${data.quizTotal}\n\nTransform your flight time → boreding.app`;
  }, [data, contentData, scoreEmoji]);

  const shareToInstagram = useCallback(async () => {
    trackShareClick('share_instagram', data?.destination ?? '');
    const uri = await saveScreenshotToGallery();
    if (!uri) return;

    const canOpen = await Linking.canOpenURL('instagram://app');
    if (canOpen) {
      Alert.alert(
        'Screenshot Saved!',
        'Your results have been saved to your gallery. Instagram will open — create a new post or story and select the screenshot.',
        [{ text: 'Open Instagram', onPress: () => Linking.openURL('instagram://app') }],
      );
    } else {
      Alert.alert(
        'Screenshot Saved!',
        'Your results have been saved to your gallery. Install Instagram to share, or find the image in your photos.',
      );
    }
  }, [data, saveScreenshotToGallery]);

  const shareToX = useCallback(async () => {
    trackShareClick('share_x', data?.destination ?? '');
    const uri = await saveScreenshotToGallery();
    if (!uri) return;

    const text = getShareText();
    const encoded = encodeURIComponent(text);

    const canOpen = await Linking.canOpenURL('twitter://app');
    if (canOpen) {
      Alert.alert(
        'Screenshot Saved!',
        'Your results have been saved to your gallery. X will open — create a new post and attach the screenshot.',
        [{ text: 'Open X', onPress: () => Linking.openURL(`twitter://post?message=${encoded}`) }],
      );
    } else {
      Alert.alert(
        'Screenshot Saved!',
        'Your results have been saved to your gallery. X will open in your browser — attach the screenshot to your post.',
        [{ text: 'Open X', onPress: () => Linking.openURL(`https://x.com/intent/tweet?text=${encoded}`) }],
      );
    }
  }, [data, saveScreenshotToGallery, getShareText]);

  if (!data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/quiz')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.duration(500)}>
          {/* Share Card */}
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
            <View style={styles.shareCard}>
              {/* Logo */}
              <Text style={styles.cardLogo}>✈️ Boreding</Text>

              {/* Destination */}
              <View style={styles.cardHero}>
                <Text style={styles.cardLabel}>I LEARNED ALL ABOUT</Text>
                <Text style={styles.cardTitle}>{data.destination}</Text>
                <Text style={styles.cardCountry}>{data.country}</Text>
              </View>

              {/* Score */}
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreEmoji}>{scoreEmoji}</Text>
                <View>
                  <Text style={styles.scoreTitle}>{scoreLabel}</Text>
                  <Text style={styles.scoreDetail}>
                    {data.quizScore}/{data.quizTotal} quiz
                    {contentData && ` · ${contentData.sectionsCompleted}/${contentData.totalSections} sections`}
                  </Text>
                </View>
              </View>

              {/* Section titles */}
              {contentData && (
                <View style={styles.sectionsList}>
                  <Text style={styles.sectionsLabel}>WHAT I COVERED</Text>
                  {contentData.sectionTitles.map((title, i) => (
                    <View key={i} style={styles.sectionItem}>
                      <Text style={styles.sectionCheck}>✓</Text>
                      <Text style={styles.sectionName} numberOfLines={1}>{title}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Stats */}
              {contentData && (
                <View style={styles.statsBar}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {Math.floor(contentData.flightDuration / 60)}h {contentData.flightDuration % 60}m
                    </Text>
                    <Text style={styles.statLabel}>Flight time</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {contentData.sectionsCompleted}/{contentData.totalSections}
                    </Text>
                    <Text style={styles.statLabel}>Sections</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {data.quizScore}/{data.quizTotal}
                    </Text>
                    <Text style={styles.statLabel}>Quiz score</Text>
                  </View>
                </View>
              )}

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.footerUrl}>boreding.app</Text>
                <Text style={styles.footerTagline}>Learn while you fly ✈️</Text>
              </View>
            </View>
          </ViewShot>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.instagramBtn} onPress={shareToInstagram} activeOpacity={0.8}>
                <Text style={styles.socialBtnText}>📸 Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.xBtn} onPress={shareToX} activeOpacity={0.8}>
                <Text style={styles.socialBtnText}>𝕏  Post on X</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                trackRetakeQuiz(data?.destination ?? '');
                router.replace('/quiz');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>🔄 Retake Quiz</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: insets.bottom + 40 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    color: Colors.slate[400],
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  shareCard: {
    borderRadius: 20,
    padding: 28,
    backgroundColor: Colors.sky[900],
    overflow: 'hidden',
  },
  cardLogo: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sky[300],
    marginBottom: 20,
  },
  cardHero: {
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: 'rgba(125, 211, 252, 0.8)',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  cardCountry: {
    fontSize: 16,
    color: 'rgba(186, 230, 253, 0.6)',
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  scoreEmoji: {
    fontSize: 36,
  },
  scoreTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
  scoreDetail: {
    fontSize: 12,
    color: 'rgba(186, 230, 253, 0.6)',
    marginTop: 2,
  },
  sectionsList: {
    marginBottom: 20,
  },
  sectionsLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(125, 211, 252, 0.5)',
    marginBottom: 8,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionCheck: {
    fontSize: 12,
    color: Colors.emerald[400],
  },
  sectionName: {
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.8)',
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(186, 230, 253, 0.5)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerUrl: {
    fontSize: 11,
    color: 'rgba(186, 230, 253, 0.3)',
    fontWeight: '500',
  },
  footerTagline: {
    fontSize: 10,
    color: 'rgba(186, 230, 253, 0.2)',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  instagramBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#E1306C',
  },
  xBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: Colors.bgCardSolid,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate[300],
  },
});
