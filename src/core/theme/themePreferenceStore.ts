import Storage from 'expo-sqlite/kv-store';
import { normalizeThemePreference, ThemeMode } from '../../ui/theme';
import { THEME_PREFERENCE_KEY } from './themePreferenceKey';

export { THEME_PREFERENCE_KEY };

export async function loadThemePreference(): Promise<ThemeMode> {
  const storedValue = await Storage.getItem(THEME_PREFERENCE_KEY);
  return normalizeThemePreference(storedValue);
}

export async function saveThemePreference(mode: ThemeMode): Promise<void> {
  await Storage.setItem(THEME_PREFERENCE_KEY, mode);
}
