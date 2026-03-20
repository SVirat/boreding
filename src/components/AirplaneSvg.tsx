import React from 'react';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Ellipse,
} from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface AirplaneSvgProps {
  size?: number;
}

export default function AirplaneSvg({ size = 40 }: AirplaneSvgProps) {
  const w = size * 2.4;
  const h = size * 1.4;

  const rotation = useSharedValue(-8);
  const translateY = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    translateY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [rotation, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[{ width: w, height: h }, animatedStyle]}>
      <Svg viewBox="0 0 160 60" width={w} height={h}>
        <Defs>
          <LinearGradient id="fuselageGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#f0f9ff" />
            <Stop offset="25%" stopColor="#e0f2fe" />
            <Stop offset="60%" stopColor="#bae6fd" />
            <Stop offset="100%" stopColor="#7dd3fc" />
          </LinearGradient>
          <LinearGradient id="wingGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0ea5e9" />
            <Stop offset="100%" stopColor="#0369a1" />
          </LinearGradient>
          <LinearGradient id="tailGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0%" stopColor="#0ea5e9" />
            <Stop offset="100%" stopColor="#0284c7" />
          </LinearGradient>
        </Defs>

        {/* Shadow */}
        <Ellipse cx="85" cy="56" rx="45" ry="3" fill="rgba(14,165,233,0.1)" />

        {/* Fuselage */}
        <Path
          d="M20 30 Q20 24 30 22 L120 20 Q140 20 145 25 Q148 28 145 32 L120 34 Q40 36 30 34 Q20 34 20 30Z"
          fill="url(#fuselageGrad)"
        />

        {/* Wing */}
        <Path
          d="M65 28 L58 10 Q57 7 60 7 L80 8 Q82 8 82 10 L78 28Z"
          fill="url(#wingGrad)"
        />

        {/* Tail */}
        <Path
          d="M28 24 L18 8 Q17 5 20 5 L32 6 Q34 6 34 8 L32 22Z"
          fill="url(#tailGrad)"
        />

        {/* Cockpit window */}
        <Path
          d="M135 24 Q140 22 143 24 Q145 26 143 28 L138 28 Q136 28 135 26Z"
          fill="#0ea5e9"
          opacity={0.8}
        />

        {/* Stripe */}
        <Rect x="30" y="27" width="110" height="2" rx="1" fill="#0ea5e9" opacity={0.3} />

        {/* Engine */}
        <Rect x="70" y="32" width="15" height="5" rx="2" fill="#64748b" />
      </Svg>
    </Animated.View>
  );
}
