import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuizQuestion } from '../src/lib/types';
import { trackQuizAnswer, trackQuizComplete, trackScreenView } from '../src/services/analytics';
import { Colors } from '../src/theme/colors';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { trackAppError } from '../src/services/analytics';

interface QuizData {
  destination: string;
  country: string;
  questions: QuizQuestion[];
  topic?: string;
}

export default function QuizScreen() {
  const router = useRouter();
  return (
    <ErrorBoundary screen="quiz" onReset={() => router.replace('/')}>
      <QuizScreenInner />
    </ErrorBoundary>
  );
}

function QuizScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => { trackScreenView('quiz'); }, []);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const stored = await AsyncStorage.getItem('boreding_quiz_data');
        if (stored) {
          setQuizData(JSON.parse(stored));
        } else {
          router.replace('/');
        }
      } catch (e) {
        trackAppError('E601', 'Quiz load failed', 'quiz', e instanceof Error ? e.message : String(e));
        router.replace('/');
      }
    };
    loadQuiz();
  }, [router]);

  if (!quizData || quizData.questions.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.sky[400]} style={{ marginTop: 100 }} />
      </View>
    );
  }

  const questions = quizData.questions;
  const q = questions[currentQ];

  const handleAnswer = (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    const isCorrect = index === q.correctIndex;
    trackQuizAnswer(currentQ, isCorrect);
    if (isCorrect) setScore((s) => s + 1);
  };

  const nextQuestion = async () => {
    if (currentQ + 1 >= questions.length) {
      const finalScore = score + (selectedAnswer === q.correctIndex ? 0 : 0);
      trackQuizComplete(score, questions.length, quizData.destination);

      try {
        await AsyncStorage.setItem(
          'boreding_share_data',
          JSON.stringify({
            destination: quizData.topic || quizData.destination,
            country: quizData.country,
            quizScore: score,
            quizTotal: questions.length,
            topic: quizData.topic,
          })
        );
      } catch (e) {
        trackAppError('E501', 'Failed to save share data', 'quiz', e instanceof Error ? e.message : String(e));
      }
      router.push('/share');
      return;
    }
    setCurrentQ((q) => q + 1);
    setSelectedAnswer(null);
    setAnswered(false);
  };

  const getOptionStyle = (i: number) => {
    if (!answered) return styles.optionDefault;
    if (i === q.correctIndex) return styles.optionCorrect;
    if (i === selectedAnswer && i !== q.correctIndex) return styles.optionWrong;
    return styles.optionFaded;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/content')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>🏆 {score}/{currentQ + (answered ? 1 : 0)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {questions.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentQ && styles.dotActive,
                i < currentQ && styles.dotDone,
              ]}
            />
          ))}
        </View>

        <Animated.View key={currentQ} entering={FadeInRight.duration(250)}>
          <Text style={styles.questionLabel}>
            QUESTION {currentQ + 1} OF {questions.length}
          </Text>
          <Text style={styles.questionText}>{q.question}</Text>

          <View style={styles.optionsList}>
            {q.options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.option, getOptionStyle(i)]}
                onPress={() => handleAnswer(i)}
                disabled={answered}
                activeOpacity={0.7}
              >
                <View style={styles.optionLetter}>
                  <Text style={styles.optionLetterText}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={styles.optionText}>{opt}</Text>
                {answered && i === q.correctIndex && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
                {answered && i === selectedAnswer && i !== q.correctIndex && (
                  <Text style={styles.xMark}>✗</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {answered && (
            <Animated.View entering={FadeInUp.duration(300)} style={{ marginTop: 24 }}>
              <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion} activeOpacity={0.8}>
                <Text style={styles.nextBtnText}>
                  {currentQ + 1 >= questions.length ? 'See Results →' : 'Next Question →'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    color: Colors.slate[300],
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.slate[700],
  },
  dotActive: {
    backgroundColor: Colors.sky[400],
    transform: [{ scale: 1.25 }],
  },
  dotDone: {
    backgroundColor: Colors.emerald[400],
  },
  questionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.sky[400],
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsList: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionDefault: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  optionFaded: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderColor: Colors.bgCardSolid,
    opacity: 0.4,
  },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.slate[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slate[400],
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate[300],
  },
  checkMark: {
    fontSize: 18,
    color: Colors.emerald[400],
    fontWeight: '700',
  },
  xMark: {
    fontSize: 18,
    color: Colors.red[400],
    fontWeight: '700',
  },
  nextBtn: {
    backgroundColor: Colors.sky[500],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});
