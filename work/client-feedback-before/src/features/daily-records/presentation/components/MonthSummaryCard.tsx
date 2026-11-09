import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '../../../../core/utils/currency';
import { LedgerRow } from '../../../../ui/components/LedgerRow';
import { useTheme } from '../../../../core/theme/ThemeProvider';

interface MonthOverviewMetrics {
  totalSold: number;
  totalInvested: number;
  totalAdditionalExpenses: number;
  grossProfit: number;
  netProfit: number;
  totalDataphoneSales: number;
}

export interface MonthSummaryInput {
  month: Date;
  overview: MonthOverviewMetrics;
}

interface MonthSummaryCardProps {
  monthly: MonthSummaryInput;
  isCurrentMonth?: boolean;
  badge?: string | null;
  onPressDataphone?: () => void;
  onPressMonth?: () => void;
}

export function formatMonthName(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'long' });
}

export function MonthSummaryCard({
  monthly,
  isCurrentMonth = false,
  badge = null,
  onPressDataphone,
  onPressMonth,
}: MonthSummaryCardProps) {
  const { theme } = useTheme();
  const { month, overview } = monthly;
  const monthName = formatMonthName(month);
  const monthTitle = (
    <Text
      style={[
        styles.monthName,
        {
          color: isCurrentMonth ? theme.colors.primary : theme.colors.text,
          fontFamily: theme.typography.serifFamily,
        },
      ]}
    >
      {monthName}
    </Text>
  );

  return (
    <View
      style={[
        styles.section,
        { borderBottomColor: theme.colors.border },
        isCurrentMonth
          ? { borderLeftColor: theme.colors.primary, borderLeftWidth: 2 }
          : null,
      ]}
    >
      <View style={styles.header}>
        {onPressMonth ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir mes de ${monthName} en el calendario`}
            accessibilityHint="Muestra este mes en el calendario"
            onPress={onPressMonth}
            style={({ pressed }) => [styles.headerMonthButton, pressed ? styles.pressed : null]}
          >
            {monthTitle}
            <Text accessibilityElementsHidden style={[styles.monthChevron, { color: theme.colors.mutedText }]}>›</Text>
          </Pressable>
        ) : monthTitle}
        {badge ? <Text style={[styles.badge, { color: theme.colors.primary }]}>{badge}</Text> : null}
      </View>

      <LedgerRow label="Ventas" value={formatCurrency(overview.totalSold)} />
      <LedgerRow label="Beneficio bruto" value={formatCurrency(overview.grossProfit)} />
      <LedgerRow label="Destinado a inversión" value={formatCurrency(overview.totalInvested)} />
      <LedgerRow label="Otros gastos" value={formatCurrency(overview.totalAdditionalExpenses)} />
      <LedgerRow
        label="Beneficio neto"
        value={formatCurrency(overview.netProfit)}
        valueColor={overview.netProfit < 0 ? theme.colors.danger : theme.colors.text}
      />
      <LedgerRow
        label="Ventas datafono"
        value={formatCurrency(overview.totalDataphoneSales)}
        onPress={onPressDataphone}
        accessibilityLabel={`Ventas datafono de ${monthName}, ${formatCurrency(overview.totalDataphoneSales)}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 12,
    paddingLeft: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 0,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthName: {
    fontSize: 20,
    textTransform: 'capitalize',
  },
  headerMonthButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthChevron: {
    fontSize: 20,
  },
  badge: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.65,
  },
});
