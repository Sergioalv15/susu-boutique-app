import { AppTheme, Theme } from '../../ui/theme';

export function createRootStackScreenOptions(theme: AppTheme = Theme) {
  return {
    headerShown: false,
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    contentStyle: { backgroundColor: theme.colors.background },
    headerShadowVisible: false,
    headerTitleStyle: {
      fontWeight: '700' as const,
    },
  };
}

export const rootStackScreenOptions = createRootStackScreenOptions();
