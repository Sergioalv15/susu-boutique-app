import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InvestmentBalanceScreen } from '../../../src/features/daily-records/investment/presentation/screens/InvestmentBalanceScreen';
import { ThemeProvider } from './themeShim';
import './styles.css';

type PageDiagnostic = {
  limit: number;
  type: string;
  month: string;
  cursor: { date: string; id: number } | null;
  shown: number;
  hasMore: boolean;
};

function InvestmentQaApp() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [lastPage, setLastPage] = useState<PageDiagnostic | null>(null);
  const [lastAdjustment, setLastAdjustment] = useState('No adjustment submitted');

  useEffect(() => {
    const handlePage = (event: Event) => setLastPage((event as CustomEvent<PageDiagnostic>).detail);
    const handleAdjustment = (event: Event) => {
      const item = (event as CustomEvent<{ date: string; amount: number }>).detail;
      setLastAdjustment(`${item.date} · +€${item.amount.toFixed(2)}`);
    };
    window.addEventListener('investment-qa:page', handlePage);
    window.addEventListener('investment-qa:adjustment', handleAdjustment);
    return () => {
      window.removeEventListener('investment-qa:page', handlePage);
      window.removeEventListener('investment-qa:adjustment', handleAdjustment);
    };
  }, []);

  const chooseMode = (nextMode: 'light' | 'dark') => {
    setMode(nextMode);
    window.dispatchEvent(new CustomEvent('investment-qa:theme', { detail: nextMode }));
  };

  const pageText = lastPage
    ? `${lastPage.type} · ${lastPage.month} · ${lastPage.shown}/${lastPage.limit}${lastPage.hasMore ? ' · more available' : ' · end'}${lastPage.cursor ? ` · after ${lastPage.cursor.date} #${lastPage.cursor.id}` : ''}`
    : 'Waiting for first page';

  return (
    <ThemeProvider>
      <div className="qa-shell">
        <header className="qa-toolbar">
          <span>Investment history · synthetic fixtures</span>
          <div className="qa-actions">
            <button type="button" aria-pressed={mode === 'light'} onClick={() => chooseMode('light')}>Light</button>
            <button type="button" aria-pressed={mode === 'dark'} onClick={() => chooseMode('dark')}>Dark</button>
            <span className="qa-diagnostic" aria-live="polite">Page: {pageText}</span>
            <span className="qa-diagnostic" aria-live="polite">Adjustment: {lastAdjustment}</span>
          </div>
        </header>
        <main className="qa-investment">
          <SafeAreaProvider>
            <InvestmentBalanceScreen />
          </SafeAreaProvider>
        </main>
      </div>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<InvestmentQaApp />);
