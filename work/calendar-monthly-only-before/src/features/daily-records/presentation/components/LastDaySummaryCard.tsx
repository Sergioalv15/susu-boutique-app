import { StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '../../../../core/utils/currency';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { LedgerRow } from '../../../../ui/components/LedgerRow';
import { DailyRecordViewModel } from '../../application/dto';

interface Props {
  loading: boolean;
  error: string | null;
  result: DailyRecordViewModel | null;
}

function formatRecordDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function LastDaySummaryCard({ loading, error, result }: Props) {
  const { theme } = useTheme();
  const record = result?.record;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Último día con registros</Text>
      {loading ? (
        <Text style={[styles.state, { color: theme.colors.mutedText }]}>Cargando resumen...</Text>
      ) : error ? (
        <Text accessibilityRole="alert" style={[styles.state, { color: theme.colors.danger }]}>{error}</Text>
      ) : !record || !result ? (
        <Text style={[styles.state, { color: theme.colors.mutedText }]}>Todavía no hay días registrados.</Text>
      ) : (
        <>
          <Text style={[styles.date, { color: theme.colors.mutedText }]}>{formatRecordDate(record.date)}</Text>
          <View style={styles.rows}>
            <LedgerRow label="Ventas" value={formatCurrency(record.totalSold)} valueColor={theme.colors.sales} />
            <LedgerRow
              label="Beneficio bruto"
              value={formatCurrency(result.profit.grossProfit)}
              valueColor={result.profit.grossProfit < 0 ? theme.colors.danger : result.profit.grossProfit > 0 ? theme.colors.success : theme.colors.text}
            />
            <LedgerRow label="Destinado a inversión" value={formatCurrency(result.profit.investment)} valueColor={theme.colors.investment} />
            <LedgerRow label="Otros gastos" value={formatCurrency(record.additionalExpenses)} valueColor={theme.colors.danger} />
            <LedgerRow
              label={result.profit.netProfit < 0 ? 'Pérdida neta' : 'Beneficio neto'}
              value={formatCurrency(result.profit.netProfit)}
              valueColor={result.profit.netProfit < 0 ? theme.colors.danger : result.profit.netProfit > 0 ? theme.colors.success : theme.colors.text}
            />
            <LedgerRow label="Ventas datafono" value={formatCurrency(record.dataphoneSales ?? 0)} valueColor={theme.colors.sales} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
  },
  date: {
    marginTop: 2,
    marginBottom: 4,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  rows: {
    gap: 2,
  },
  state: {
    paddingVertical: 10,
    fontSize: 14,
  },
});
