import { normalizeThemePreference, ThemeMode } from '../../ui/theme';
import { THEME_PREFERENCE_KEY } from './themePreferenceKey';

export { THEME_PREFERENCE_KEY };

// `expo-sqlite/kv-store` opens its own database on the shared SQLite web worker.
// Doing that while the app database bootstraps races the one-time worker
// initialization and breaks every later SQLite call, so on web we use
// `localStorage` instead.
function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export async function loadThemePreference(): Promise<ThemeMode> {
  return normalizeThemePreference(getLocalStorage()?.getItem(THEME_PREFERENCE_KEY) ?? null);
}

export async function saveThemePreference(mode: ThemeMode): Promise<void> {
  getLocalStorage()?.setItem(THEME_PREFERENCE_KEY, mode);
}
