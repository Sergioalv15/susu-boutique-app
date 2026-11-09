import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CalendarScreen } from '../../../src/features/daily-records/presentation/screens/CalendarScreen';
import { ThemeProvider } from './themeShim';
import './styles.css';

function CalendarQaApp() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [lastRoute, setLastRoute] = useState('No route selected');

  useEffect(() => {
    const handleRoute = (event: Event) => setLastRoute((event as CustomEvent<string>).detail);
    window.addEventListener('calendar-qa:route', handleRoute);
    return () => window.removeEventListener('calendar-qa:route', handleRoute);
  }, []);

  const chooseMode = (nextMode: 'light' | 'dark') => {
    setMode(nextMode);
    window.dispatchEvent(new CustomEvent('calendar-qa:theme', { detail: nextMode }));
  };

  return (
    <ThemeProvider>
      <div className="qa-shell">
        <header className="qa-toolbar">
          <span>Calendar source QA · synthetic data</span>
          <div className="qa-actions">
            <button type="button" aria-pressed={mode === 'light'} onClick={() => chooseMode('light')}>Light</button>
            <button type="button" aria-pressed={mode === 'dark'} onClick={() => chooseMode('dark')}>Dark</button>
            <span className="qa-route" aria-live="polite">Last route: {lastRoute}</span>
          </div>
        </header>
        <main className="qa-calendar">
          <SafeAreaProvider>
            <CalendarScreen />
          </SafeAreaProvider>
        </main>
      </div>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<CalendarQaApp />);
