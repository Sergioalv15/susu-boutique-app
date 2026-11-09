import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppTheme, resolveTheme, ThemeMode } from '../../../src/ui/theme';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  isHydrated: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const updateMode = (event: Event) => {
      const nextMode = (event as CustomEvent<ThemeMode>).detail;
      if (nextMode === 'light' || nextMode === 'dark') setMode(nextMode);
    };

    window.addEventListener('calendar-qa:theme', updateMode);
    return () => window.removeEventListener('calendar-qa:theme', updateMode);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme: resolveTheme(mode, 'serif'),
    mode,
    isHydrated: true,
    setMode: async (nextMode) => setMode(nextMode),
    toggleTheme: async () => setMode((current) => current === 'light' ? 'dark' : 'light'),
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
