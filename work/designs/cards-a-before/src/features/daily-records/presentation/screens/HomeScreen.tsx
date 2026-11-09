import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../../../ui/components/Screen';
import { LedgerRow } from '../../../../ui/components/LedgerRow';
import { PrimaryButton } from '../../../../ui/components/PrimaryButton';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { createFocusRefreshGuard } from '../../../../core/utils/focusRefreshGuard';
import { formatCurrency } from '../../../../core/utils/currency';
import { monthKey, startOfMonth, toIsoDate } from '../../../../core/utils/date';
import { useMonthlyOverview } from '../hooks/useMonthlyOverview';
import { deriveHomeKpis } from '../home/deriveHomeKpis';
import { useInvestmentBalance } from '../../investment/presentation/hooks/useInvestmentBalance';

function formatRecordDate(date: string | null): string {
  if (!date) {
    return 'Sin registros';
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

export function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [today, setToday] = useState(() => new Date());
  const todayIso = toIsoDate(today);
  const overviewMonthKey = monthKey(today);
  const overviewMonth = useMemo(
    () => startOfMonth(new Date(`${overviewMonthKey}-01T00:00:00`)),
    [overviewMonthKey],
  );
  const { loading, error, overview, records, refresh } = useMonthlyOverview(overviewMonth);
  const investmentBalance = useInvestmentBalance();
  const shouldRefreshOnFocus = useRef(createFocusRefreshGuard());

  useFocusEffect(
    useCallback(() => {
      setToday(new Date());
      void investmentBalance.refresh();

      if (shouldRefreshOnFocus.current()) {
        void refresh();
      }
    }, [refresh, investmentBalance.refresh]),
  );

  if (loading) {
    return (
      <Screen topInset bottomInset={false}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.supportingText, { color: theme.colors.mutedText }]}>Cargando resumen...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !overview) {
    const technicalDetail = error?.technicalMessage;

    return (
      <Screen topInset bottomInset={false}>
        <View style={styles.center}>
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>
            {error?.userMessage ?? 'No se pudo cargar el inicio.'}
          </Text>
          {__DEV__ && technicalDetail ? (
            <Text style={[styles.supportingText, { color: theme.colors.mutedText }]}>{technicalDetail}</Text>
          ) : null}
          <PrimaryButton title="Reintentar" onPress={() => void refresh()} />
        </View>
      </Screen>
    );
  }

  const kpis = deriveHomeKpis(overview, records);
  const businessName = Constants.expoConfig?.name ?? 'Modas Nicolas';
  const monthName = overviewMonth.toLocaleDateString('es-ES', { month: 'long' });
  const todayLabel = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const latestMonth = kpis.lastRecordDate
    ? monthKey(new Date(`${kpis.lastRecordDate}T00:00:00`))
    : monthKey(overviewMonth);

  return (
    <Screen topInset bottomInset={false}>
      <View style={styles.brandHeader}>
        <View style={styles.brand}>
          <Text
            style={[
              styles.businessName,
              { color: theme.colors.text, fontFamily: theme.typography.serifFamily },
            ]}
          >
            {businessName}
          </Text>
          <Text style={[styles.supportingText, { color: theme.colors.mutedText }]}>Tu negocio, al día</Text>
        </View>
        <Text style={[styles.today, { color: theme.colors.mutedText }]}>{todayLabel}</Text>
      </View>

      <View style={[styles.monthHeading, { borderBottomColor: theme.colors.border }]}>
        <Text
          style={[
            styles.monthName,
            { color: theme.colors.text, fontFamily: theme.typography.serifFamily },
          ]}
        >
          {monthName}
        </Text>
        <Text style={[styles.year, { color: theme.colors.mutedText }]}>{overviewMonth.getFullYear()}</Text>
      </View>

      <View style={styles.ledger}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Beneficio neto</Text>
          <Text
            style={[
              styles.totalValue,
              {
                color: overview.netProfit < 0 ? theme.colors.danger : theme.colors.text,
                fontFamily: theme.typography.serifFamily,
              },
            ]}
          >
            {formatCurrency(overview.netProfit)}
          </Text>
        </View>
        <LedgerRow label="Ventas" value={formatCurrency(overview.totalSold)} />
        <LedgerRow label="Beneficio bruto" value={formatCurrency(overview.grossProfit)} />
        <LedgerRow label="Otros gastos" value={formatCurrency(overview.totalAdditionalExpenses)} />
        {overview.trackedDays === 0 ? (
          <Text style={[styles.emptyHint, { color: theme.colors.mutedText }]}>Todavía no hay registros este mes.</Text>
        ) : null}
      </View>

      <PrimaryButton
        title="Registrar el día"
        onPress={() => router.push(`/day/${todayIso}`)}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Registrar inversión para ${todayIso}`}
        onPress={() => router.push(`/investment/purchase?date=${todayIso}` as never)}
        style={({ pressed }) => [styles.secondaryAction, pressed ? styles.pressed : null]}
      >
        <Text style={[styles.secondaryActionLabel, { color: theme.colors.primary }]}>Registrar inversión</Text>
        <Text style={[styles.supportingText, { color: theme.colors.mutedText }]}>Hoy</Text>
      </Pressable>

      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.text, fontFamily: theme.typography.serifFamily },
          ]}
        >
          Libro del mes
        </Text>
        <LedgerRow
          label="Último registro"
          value={formatRecordDate(kpis.lastRecordDate)}
          onPress={() => router.push(`/calendar?month=${latestMonth}` as never)}
        />
        <LedgerRow
          label="Disponible para invertir"
          value={
            investmentBalance.error
              ? 'No disponible'
              : investmentBalance.loading
                ? 'Cargando…'
                : formatCurrency(investmentBalance.available)
          }
          accessibilityLabel={`Disponible para invertir, ${investmentBalance.error ? 'no disponible' : investmentBalance.loading ? 'cargando' : formatCurrency(investmentBalance.available)}`}
          onPress={() => router.push('/investment/balance' as never)}
        />
        {investmentBalance.error ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>
            {investmentBalance.error}
          </Text>
        ) : null}
        <LedgerRow
          label="Balance anual"
          value="Ver resumen"
          onPress={() => router.push('/annual' as never)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: {
    flex: 1,
    minWidth: 0,
  },
  businessName: {
    fontSize: 20,
  },
  supportingText: {
    fontSize: 12,
    lineHeight: 18,
  },
  today: {
    maxWidth: '48%',
    fontSize: 12,
    textAlign: 'right',
  },
  monthHeading: {
    minHeight: 58,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthName: {
    fontSize: 32,
    lineHeight: 40,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  year: {
    fontSize: 13,
  },
  ledger: {
    gap: 0,
  },
  totalRow: {
    minHeight: 60,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  totalLabel: {
    fontSize: 15,
    flexShrink: 1,
  },
  totalValue: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'right',
    flexShrink: 1,
  },
  emptyHint: {
    paddingVertical: 8,
    fontSize: 13,
  },
  secondaryAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  secondaryActionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 2,
    fontSize: 18,
  },
  center: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
});
