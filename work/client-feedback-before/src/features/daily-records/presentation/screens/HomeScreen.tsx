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
import { KpiCard } from '../components/KpiCard';

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
  const [showBreakdown, setShowBreakdown] = useState(false);
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
  const netProfitLabel = overview.netProfit < 0 ? 'Pérdida neta' : 'Beneficio neto';
  const formattedAvailable = investmentBalance.error
    ? 'No disponible'
    : investmentBalance.loading
      ? 'Cargando…'
      : formatCurrency(investmentBalance.available);

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

      <View style={styles.monthHeading}>
        <Text
          style={[
            styles.monthName,
            { color: theme.colors.text, fontFamily: theme.typography.serifFamily },
          ]}
        >
          {`${monthName} ${overviewMonth.getFullYear()}`}
        </Text>
      </View>
      <Text style={[styles.monthCaption, { color: theme.colors.mutedText }]}>Resumen del mes</Text>

      <View
        style={[
          styles.netCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.cardLabel, { color: theme.colors.mutedText }]}>{netProfitLabel}</Text>
        <Text
          accessibilityLabel={`${netProfitLabel}, ${formatCurrency(overview.netProfit)}`}
          style={[
            styles.netValue,
            {
              color:
                overview.netProfit < 0
                  ? theme.colors.danger
                  : overview.netProfit > 0
                    ? theme.colors.success
                    : theme.colors.text,
            },
          ]}
        >
          {`${overview.netProfit < 0 ? '−' : overview.netProfit > 0 ? '+' : ''}${formatCurrency(Math.abs(overview.netProfit))}`}
        </Text>
      </View>

      <View style={styles.metricGrid}>
        <KpiCard label="Ventas" value={formatCurrency(overview.totalSold)} valueColor={theme.colors.sales} />
        <KpiCard
          label="Beneficio bruto"
          value={formatCurrency(overview.grossProfit)}
          valueColor={overview.grossProfit > 0 ? theme.colors.success : theme.colors.text}
        />
        <KpiCard
          label="Gastos"
          value={formatCurrency(overview.totalAdditionalExpenses)}
          valueColor={theme.colors.danger}
        />
        <KpiCard
          label="Inversión asignada"
          value={formatCurrency(overview.totalInvested)}
          valueColor={theme.colors.investment}
        />
      </View>

      <View style={styles.availableSection}>
        <LedgerRow
          label="Disponible para invertir"
          value={formattedAvailable}
          valueColor={theme.colors.investment}
          accessibilityLabel={`Disponible para invertir, ${formattedAvailable}`}
          onPress={() => router.push('/investment/balance' as never)}
        />
        {investmentBalance.error ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>
            {investmentBalance.error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showBreakdown ? 'Ocultar desglose' : 'Ver desglose'}
          accessibilityState={{ expanded: showBreakdown }}
          onPress={() => setShowBreakdown((visible) => !visible)}
          style={({ pressed }) => [
            styles.breakdownToggle,
            { borderColor: theme.colors.border },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.breakdownToggleText, { color: theme.colors.text }]}>
            {showBreakdown ? 'Ocultar desglose' : 'Ver desglose'}
          </Text>
        </Pressable>
        {showBreakdown ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.breakdown, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.breakdownText, { color: theme.colors.text }]}>
              Beneficio bruto ({formatCurrency(overview.grossProfit)}) − gastos ({formatCurrency(overview.totalAdditionalExpenses)}) = resultado neto ({formatCurrency(overview.netProfit)}).
            </Text>
            <Text style={[styles.breakdownText, { color: theme.colors.mutedText }]}>
              {`Disponible: ${formattedAvailable} · Asignado: ${formatCurrency(overview.totalInvested)}. La inversión asignada no forma parte de los gastos.`}
            </Text>
          </View>
        ) : null}
      </View>

      {overview.trackedDays === 0 ? (
        <Text style={[styles.emptyHint, { color: theme.colors.mutedText }]}>Todavía no hay registros este mes.</Text>
      ) : null}

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
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  monthName: {
    fontSize: 30,
    lineHeight: 38,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  monthCaption: {
    marginTop: -4,
    fontSize: 12,
    lineHeight: 18,
  },
  netCard: {
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardLabel: {
    fontSize: 12,
    lineHeight: 17,
  },
  netValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availableSection: {
    gap: 4,
  },
  breakdownToggle: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  breakdownToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdown: {
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  breakdownText: {
    fontSize: 13,
    lineHeight: 20,
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
