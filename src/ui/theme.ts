export type ThemeMode = 'light' | 'dark';

const spacing = {
  xs: 4,
  sm: 8,
  compact: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

const radius = {
  sm: 4,
  md: 6,
  lg: 8,
} as const;

const typography = {
  serifFamily: 'serif',
  pageHeading: 32,
  primaryTotal: 34,
  sectionHeading: 18,
  body: 15,
  supporting: 12,
} as const;

type AppTypography = Omit<typeof typography, 'serifFamily'> & { serifFamily: string };

const lightColors = {
  background: '#FAF5EB',
  surface: '#FFFCF6',
  card: '#F0E4D2',
  primary: '#85492F',
  primarySoft: '#A35E3B',
  onPrimary: '#FFF9EF',
  text: '#382E24',
  mutedText: '#77624F',
  border: '#E2D6C3',
  success: '#476747',
  danger: '#A24032',
  sales: '#2F638D',
  investment: '#865D22',
  white: '#FFFFFF',
  black: '#111111',
  inputBackground: '#FFFCF6',
  drawerOverlay: 'rgba(56,46,36,0.2)',
  calendarBackground: '#FAF5EB',
  calendarSurface: '#FFFCF6',
  calendarText: '#382E24',
  calendarMutedText: '#77624F',
  calendarBorder: '#E2D6C3',
  calendarHighlight: 'rgba(133,73,47,0.18)',
  calendarLoadingOverlay: 'rgba(250,245,235,0.9)',
} as const;

const darkColors = {
  background: '#27231C',
  surface: '#302B23',
  card: '#3B3024',
  primary: '#E9B896',
  primarySoft: '#C89170',
  onPrimary: '#382315',
  text: '#F5ECDC',
  mutedText: '#C7B69E',
  border: '#4E4436',
  success: '#A7C7A2',
  danger: '#E39B91',
  sales: '#A3CCEF',
  investment: '#E7C085',
  white: '#FFFFFF',
  black: '#111111',
  inputBackground: '#302B23',
  drawerOverlay: 'rgba(0,0,0,0.45)',
  calendarBackground: '#27231C',
  calendarSurface: '#302B23',
  calendarText: '#F5ECDC',
  calendarMutedText: '#C7B69E',
  calendarBorder: '#4E4436',
  calendarHighlight: 'rgba(233,184,150,0.2)',
  calendarLoadingOverlay: 'rgba(39,35,28,0.9)',
} as const;

export type ThemeColorKey = keyof typeof lightColors;
export type ThemeColors = Record<ThemeColorKey, string>;

export type AppTheme = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: AppTypography;
};

export function normalizeThemePreference(value: string | null | undefined): ThemeMode {
  return value === 'dark' ? 'dark' : 'light';
}

export function resolveTheme(mode: ThemeMode, serifFamily: string = typography.serifFamily): AppTheme {
  const colors = mode === 'dark' ? darkColors : lightColors;

  return {
    mode,
    isDark: mode === 'dark',
    colors,
    spacing,
    radius,
    typography: { ...typography, serifFamily },
  };
}

export const Theme = resolveTheme('light');
