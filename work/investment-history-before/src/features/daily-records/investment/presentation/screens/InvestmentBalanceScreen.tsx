import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../ui/components/Screen';
import { LedgerRow } from '../../../../../ui/components/LedgerRow';
import { useTheme } from '../../../../../core/theme/ThemeProvider';
import { formatCurrency } from '../../../../../core/utils/currency';
import { investmentBalanceService } from '../../../infrastructure/container';
import { InvestmentHistoryItem } from '../../domain/types';
import { useInvestmentBalance } from '../hooks/useInvestmentBalance';
import { InvestmentBalanceCard } from '../components/InvestmentBalanceCard';

function formatHistoryDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function InvestmentBalanceScreen() {
  const { theme } = useTheme();
  const balance = useInvestmentBalance();
  const [history, setHistory] = useState<InvestmentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const historyRevision = useRef(0);
  const focusCount = useRef(0);

  const refreshHistory = useCallback(async () => {
    const request = ++historyRevision.current;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const items = await investmentBalanceService.listHistory();
      if (request === historyRevision.current) setHistory(items);
    } catch {
      if (request === historyRevision.current) setHistoryError(true);
    } finally {
      if (request === historyRevision.current) setHistoryLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (focusCount.current > 0) void balance.refresh();
      focusCount.current += 1;
      void refreshHistory();
      return () => {
        historyRevision.current += 1;
      };
    }, [balance.refresh, refreshHistory]),
  );

  const addAdjustment = useCallback(async (input: { date: string; amount: number; note: string }) => {
    const saved = await balance.addAdjustment(input);
    if (saved) await refreshHistory();
    return saved;
  }, [balance.addAdjustment, refreshHistory]);

  const addPurchase = useCallback(async (input: {
    date: string;
    amount: number;
    note: string;
    supplierId?: number | null;
  }) => {
    const saved = await balance.addPurchase(input);
    if (saved) await refreshHistory();
    return saved;
  }, [balance.addPurchase, refreshHistory]);

  return (
    <Screen>
      <InvestmentBalanceCard
        available={balance.available}
        adjustmentsTotal={balance.adjustmentsTotal}
        investedTotal={balance.investedTotal}
        purchasesTotal={balance.purchasesTotal}
        loading={balance.loading}
        adding={balance.adding}
        error={balance.error}
        actionError={balance.addError}
        onAddAdjustment={addAdjustment}
        onAddPurchase={addPurchase}
        onRefresh={() => {
          void balance.refresh();
          void refreshHistory();
        }}
      />

      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={[styles.heading, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Movimientos</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar movimientos"
            onPress={() => void refreshHistory()}
            style={styles.refreshButton}
          >
            <Text style={[styles.refreshLabel, { color: theme.colors.primary }]}>Actualizar</Text>
          </Pressable>
        </View>

        {historyLoading && history.length === 0 ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateText, { color: theme.colors.mutedText }]}>Cargando movimientos...</Text>
          </View>
        ) : null}

        {historyError ? (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={[styles.stateText, { color: theme.colors.danger }]}>No se pudo cargar el historial.</Text>
            <Pressable accessibilityRole="button" onPress={() => void refreshHistory()} style={styles.refreshButton}>
              <Text style={[styles.refreshLabel, { color: theme.colors.primary }]}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {!historyLoading && !historyError && history.length === 0 ? (
          <Text style={[styles.stateText, { color: theme.colors.mutedText }]}>Todavía no hay movimientos de capital.</Text>
        ) : null}

        {history.map((item) => {
          const amount = item.supplierName ? -Math.abs(item.amount) : item.amount;
          return (
            <LedgerRow
              key={item.id}
              label={item.supplierName ? `Compra · ${item.supplierName}` : 'Ajuste manual'}
              hint={[formatHistoryDate(item.date), item.note].filter(Boolean).join(' · ')}
              value={formatCurrency(amount)}
              valueColor={amount < 0 ? theme.colors.danger : undefined}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  historySection: {
    marginTop: 12,
  },
  historyHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    fontSize: 20,
  },
  refreshButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  refreshLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  state: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stateText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
