import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ContentSection } from '../lib/types';
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

interface SectionCardProps {
  section: ContentSection;
  index: number;
  onMarkComplete: (id: string) => void;
  pending?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  scrollProgress?: number;
  onContentHeight?: (height: number) => void;
}

export default function SectionCard({
  section,
  index,
  onMarkComplete,
  pending = false,
  expanded: controlledExpanded,
  onToggle,
  scrollProgress: externalProgress = 0,
  onContentHeight,
}: SectionCardProps) {
  // Support both controlled and uncontrolled modes
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const icon = ICON_MAP[section.icon] || '🌍';

  const handleContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onContentHeight?.(e.nativeEvent.layout.height);
    },
    [onContentHeight]
  );

  /** Parse inline markdown (**bold**, *italic*) into styled Text nodes */
  const renderInline = (text: string, baseStyle: any) => {
    // Match **bold**, *italic*, or plain segments
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) {
        parts.push(
          <Text key={key++} style={baseStyle}>
            {text.slice(last, match.index)}
          </Text>
        );
      }
      if (match[1] !== undefined) {
        // **bold**
        parts.push(
          <Text key={key++} style={[baseStyle, styles.bold]}>
            {match[1]}
          </Text>
        );
      } else if (match[2] !== undefined) {
        // *italic*
        parts.push(
          <Text key={key++} style={[baseStyle, styles.italic]}>
            {match[2]}
          </Text>
        );
      }
      last = match.index + match[0].length;
    }
    if (last < text.length) {
      parts.push(
        <Text key={key++} style={baseStyle}>
          {text.slice(last)}
        </Text>
      );
    }
    return parts.length > 0 ? parts : <Text style={baseStyle}>{text}</Text>;
  };

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headings
      if (line.startsWith('## '))
        return (
          <Text key={i} style={styles.h3}>
            {renderInline(line.replace('## ', ''), styles.h3)}
          </Text>
        );
      if (line.startsWith('### '))
        return (
          <Text key={i} style={styles.h4}>
            {renderInline(line.replace('### ', ''), styles.h4)}
          </Text>
        );

      // Callout blocks
      if (/^\*\*Pro [Tt]ip:\*\*/.test(line))
        return (
          <View key={i} style={styles.proTip}>
            <Text style={styles.proTipLabel}>{'💡 Pro tip'}</Text>
            <Text style={styles.proTipText}>
              {renderInline(line.replace(/\*\*Pro [Tt]ip:\*\*\s*/, ''), styles.proTipText)}
            </Text>
          </View>
        );
      if (/^\*\*Did [Yy]ou [Kk]now\?\*\*/.test(line))
        return (
          <View key={i} style={styles.didYouKnow}>
            <Text style={styles.dykLabel}>{'🤔 Did you know?'}</Text>
            <Text style={styles.dykText}>
              {renderInline(line.replace(/\*\*Did [Yy]ou [Kk]now\?\*\*\s*/, ''), styles.dykText)}
            </Text>
          </View>
        );
      if (/^\*\*Fun [Ff]act:\*\*/.test(line))
        return (
          <View key={i} style={styles.didYouKnow}>
            <Text style={styles.dykLabel}>{'🎲 Fun fact'}</Text>
            <Text style={styles.dykText}>
              {renderInline(line.replace(/\*\*Fun [Ff]act:\*\*\s*/, ''), styles.dykText)}
            </Text>
          </View>
        );

      // Numbered list
      if (/^\d+[.)]\s/.test(line)) {
        const numMatch = line.match(/^(\d+)[.)]\s(.*)/);
        if (numMatch) {
          return (
            <View key={i} style={styles.numberedItem}>
              <Text style={styles.numberedBullet}>{numMatch[1]}.</Text>
              <Text style={styles.numberedText}>
                {renderInline(numMatch[2], styles.numberedText)}
              </Text>
            </View>
          );
        }
      }

      // Bullet list
      if (line.startsWith('- ') || line.startsWith('* '))
        return (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>{'•'}</Text>
            <Text style={styles.bulletText}>
              {renderInline(line.replace(/^[-*]\s/, ''), styles.bulletText)}
            </Text>
          </View>
        );

      // Blank line
      if (line.trim() === '') return <View key={i} style={{ height: 8 }} />;

      // Regular paragraph with inline formatting
      return (
        <Text key={i} style={styles.paragraph}>
          {renderInline(line, styles.paragraph)}
        </Text>
      );
    });
  };

  return (
    <Animated.View entering={FadeInUp.delay(index * 40).duration(300)}>
      <View
        style={[
          styles.card,
          pending && styles.cardPending,
          section.completed && styles.cardCompleted,
          expanded && !section.completed && !pending && styles.cardExpanded,
        ]}
      >
        {/* Header */}
        <TouchableOpacity
          onPress={() => {
            if (pending) return;
            if (onToggle) onToggle();
            else setInternalExpanded((e) => !e);
          }}
          style={styles.cardHeader}
          activeOpacity={pending ? 1 : 0.7}
        >
          <View
            style={[
              styles.iconBox,
              section.completed ? styles.iconBoxCompleted : pending ? styles.iconBoxPending : styles.iconBoxDefault,
            ]}
          >
            {section.completed ? (
              <Text style={{ fontSize: 14 }}>{'✅'}</Text>
            ) : (
              <Text style={{ fontSize: 14 }}>{icon}</Text>
            )}
          </View>

          <View style={styles.headerText}>
            <Text
              style={[
                styles.sectionTitle,
                section.completed && { color: Colors.emerald[300] },
                pending && { color: Colors.slate[500] },
              ]}
              numberOfLines={1}
            >
              {section.title}
            </Text>
            <Text style={styles.sectionMeta}>~{section.estimatedMinutes} min</Text>
          </View>

          {pending ? (
            <View style={styles.writingBadge}>
              <PulsingDot />
              <Text style={styles.writingBadgeText}>Writing</Text>
            </View>
          ) : section.completed ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>Done</Text>
            </View>
          ) : null}

          {!pending && <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>}
        </TouchableOpacity>

        {/* Progress bar */}
        {expanded && !pending && (
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${section.completed ? 100 : externalProgress}%`,
                  backgroundColor: Colors.emerald[400],
                },
              ]}
            />
          </View>
        )}

        {/* Content */}
        {expanded && !pending && (
          <View style={styles.contentInline}>
            <View onLayout={handleContentLayout} style={styles.contentInner}>
              {renderContent(section.content)}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    overflow: 'hidden',
  },
  cardCompleted: {
    borderColor: 'rgba(52, 211, 153, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  cardPending: {
    opacity: 0.6,
    borderColor: 'rgba(51, 65, 85, 0.3)',
    borderStyle: 'dashed' as const,
  },
  cardExpanded: {
    borderColor: 'rgba(14, 165, 233, 0.3)',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDefault: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  iconBoxCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  iconBoxPending: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
  },
  headerText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.slate[200],
  },
  sectionMeta: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 1,
  },
  doneBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  doneBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.emerald[400],
  },
  writingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  writingBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.sky[400],
  },
  progressPct: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.sky[400],
  },
  chevron: {
    fontSize: 10,
    color: Colors.slate[500],
  },
  progressBarTrack: {
    height: 2,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    marginHorizontal: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1,
  },
  contentInline: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
  },
  contentInner: {
    paddingBottom: 8,
  },
  h3: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.slate[100],
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  h4: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate[200],
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14.5,
    color: Colors.slate[300],
    lineHeight: 23,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
    color: Colors.slate[200],
  },
  italic: {
    fontStyle: 'italic',
    color: Colors.slate[400],
  },
  bulletRow: {
    flexDirection: 'row' as const,
    marginLeft: 4,
    marginBottom: 4,
    paddingRight: 12,
  },
  bulletDot: {
    fontSize: 14,
    color: Colors.sky[400],
    lineHeight: 23,
    width: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: 14.5,
    color: Colors.slate[300],
    lineHeight: 23,
  },
  numberedItem: {
    flexDirection: 'row' as const,
    marginLeft: 4,
    marginBottom: 4,
    paddingRight: 12,
  },
  numberedBullet: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.sky[400],
    lineHeight: 23,
    width: 22,
  },
  numberedText: {
    flex: 1,
    fontSize: 14.5,
    color: Colors.slate[300],
    lineHeight: 23,
  },
  proTip: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderLeftWidth: 2,
    borderLeftColor: Colors.amber[400],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginVertical: 8,
  },
  proTipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.amber[400],
    marginBottom: 4,
  },
  proTipText: {
    fontSize: 13.5,
    color: Colors.slate[300],
    lineHeight: 21,
  },
  didYouKnow: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderLeftWidth: 2,
    borderLeftColor: Colors.sky[400],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginVertical: 8,
  },
  dykLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sky[400],
    marginBottom: 4,
  },
  dykText: {
    fontSize: 13.5,
    color: Colors.slate[300],
    lineHeight: 21,
  },
});
