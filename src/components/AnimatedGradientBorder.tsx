import React, { useEffect, useState } from 'react';
import { View, Platform, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Props {
  children: React.ReactNode;
  borderWidth?: number;
  borderRadius?: number;
  colors?: string[];
  speed?: number;
  animated?: boolean;
}

function WebAnimatedBorder({
  children,
  borderWidth = 2,
  borderRadius = 12,
  colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'],
  speed = 3,
  animated = true,
}: Props) {
  const gradientColors = colors.join(', ');
  const cssAnimation = `
    @keyframes borderRotate {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;

  if (!animated) {
    return (
      <View style={{ borderRadius, borderWidth, borderColor: 'rgba(71, 85, 105, 0.4)' }}>
        {children}
      </View>
    );
  }

  return (
    <View style={{ borderRadius, padding: borderWidth }}>
      <style dangerouslySetInnerHTML={{ __html: cssAnimation }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          background: `linear-gradient(270deg, ${gradientColors})`,
          backgroundSize: '400% 400%',
          animation: `borderRotate ${speed}s ease infinite`,
        }}
      />
      <View style={{ borderRadius: borderRadius - borderWidth, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function NativeAnimatedBorder({
  children,
  borderWidth = 2,
  borderRadius = 12,
  colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'],
  speed = 3,
  animated = true,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration: speed * 1000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      progress.value = 0;
    }
  }, [speed, animated]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && (width !== size.w || height !== size.h)) {
      setSize({ w: width, h: height });
    }
  };

  // Rounded-rect perimeter
  const { w, h } = size;
  const r = Math.min(borderRadius, w / 2, h / 2);
  const perimeter =
    w > 0 ? 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r : 0;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: -progress.value * perimeter,
  }));

  if (!animated) {
    return (
      <View
        onLayout={onLayout}
        style={{ borderRadius, borderWidth, borderColor: 'rgba(71, 85, 105, 0.4)' }}
      >
        {children}
      </View>
    );
  }

  const half = borderWidth / 2;

  return (
    <View onLayout={onLayout} style={{ borderRadius, padding: borderWidth }}>
      {w > 0 && (
        <Svg
          width={w}
          height={h}
          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
          pointerEvents="none"
        >
          <Defs>
            <SvgLinearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="1">
              {colors.map((color, i) => (
                <Stop
                  key={i}
                  offset={String(i / (colors.length - 1))}
                  stopColor={color}
                />
              ))}
            </SvgLinearGradient>
          </Defs>
          {/* Full gradient border (static base) */}
          <Rect
            x={half}
            y={half}
            width={w - borderWidth}
            height={h - borderWidth}
            rx={r - half}
            ry={r - half}
            stroke="url(#borderGrad)"
            strokeWidth={borderWidth}
            fill="none"
            opacity={0.4}
          />
          {/* Bright sweep — clockwise */}
          <AnimatedRect
            x={half}
            y={half}
            width={w - borderWidth}
            height={h - borderWidth}
            rx={r - half}
            ry={r - half}
            stroke="url(#borderGrad)"
            strokeWidth={borderWidth}
            fill="none"
            strokeDasharray={`${perimeter * 0.35} ${perimeter * 0.65}`}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>
      )}
      {children}
    </View>
  );
}

export default function AnimatedGradientBorder(props: Props) {
  if (Platform.OS === 'web') {
    return <WebAnimatedBorder {...props} />;
  }
  return <NativeAnimatedBorder {...props} />;
}
