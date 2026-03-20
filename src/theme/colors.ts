export const Colors = {
  bg: '#0f172a',
  bgLight: '#1e293b',
  bgCard: 'rgba(30, 41, 59, 0.6)',
  bgCardSolid: '#1e293b',
  border: 'rgba(51, 65, 85, 0.6)',
  borderLight: 'rgba(51, 65, 85, 0.4)',

  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },
  orange: {
    400: '#fb923c',
    500: '#f97316',
  },
  emerald: {
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
  },
  red: {
    400: '#f87171',
    500: '#ef4444',
  },
  violet: {
    400: '#a78bfa',
    500: '#8b5cf6',
  },
  white: '#ffffff',
  transparent: 'transparent',
} as const;

export const Fonts = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  semibold: { fontWeight: '600' as const },
  bold: { fontWeight: '700' as const },
  extrabold: { fontWeight: '800' as const },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;
