import React from 'react';
import { Platform, View } from 'react-native';

interface SliderProps {
  style?: any;
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

function WebSlider({
  style,
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor = '#0ea5e9',
  maximumTrackTintColor = '#334155',
  thumbTintColor = '#38bdf8',
}: SliderProps) {
  const pct = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
  return (
    <View style={style}>
      <input
        type="range"
        min={minimumValue}
        max={maximumValue}
        step={step}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: 6,
          accentColor: thumbTintColor,
          background: `linear-gradient(to right, ${minimumTrackTintColor} 0%, ${minimumTrackTintColor} ${pct}%, ${maximumTrackTintColor} ${pct}%, ${maximumTrackTintColor} 100%)`,
          borderRadius: 3,
          cursor: 'pointer',
          WebkitAppearance: 'none' as any,
        }}
      />
    </View>
  );
}

let NativeSlider: React.ComponentType<SliderProps> | null = null;
if (Platform.OS !== 'web') {
  try {
    NativeSlider = require('@react-native-community/slider').default;
  } catch (e) {
    console.warn('[W801] @react-native-community/slider unavailable:', e instanceof Error ? e.message : e);
  }
}

export default function CrossPlatformSlider(props: SliderProps) {
  if (Platform.OS === 'web') {
    return <WebSlider {...props} />;
  }
  if (NativeSlider) {
    return <NativeSlider {...props} />;
  }
  return null;
}
