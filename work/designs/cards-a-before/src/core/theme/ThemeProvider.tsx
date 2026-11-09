import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform } from 'react-native';
import { AppTheme, resolveTheme, ThemeMode } from '../../ui/theme';
import { loadThemePreference, saveThemePreference } from './themePreferenceStore';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  isHydrated: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function pickNextMode(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const storedMode = await loadThemePreference();
        if (mounted) {
          setModeState(storedMode);
        }
      } catch (error) {
        console.error('[ThemeProvider] Failed to load persisted theme preference', error);
      } finally {
        if (mounted) {
          setIsHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);

    try {
      await saveThemePreference(nextMode);
    } catch (error) {
      console.error('[ThemeProvider] Failed to persist theme preference', error);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode = pickNextMode(mode);
    await setMode(nextMode);
  }, [mode, setMode]);

  useEffect(() => {
    Appearance.setColorScheme(mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolveTheme(
        mode,
        Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) ?? 'serif',
      ),
      mode,
      isHydrated,
      setMode,
      toggleTheme,
    }),
    [isHydrated, mode, setMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
