import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../ui/components/Screen';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { useDailyRecord } from '../hooks/useDailyRecord';
import { DailyRecordForm } from '../components/DailyRecordForm';

export function DailyRecordScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? '';

  const state = useDailyRecord(date);

  if (!date) {
    return (
      <Screen keyboardAware>
        <Text style={[styles.error, { color: theme.colors.danger }]}>Fecha inválida</Text>
      </Screen>
    );
  }

  if (state.loading) {
    return (
      <Screen keyboardAware>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.muted, { color: theme.colors.mutedText }]}>Cargando día...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboardAware>
      <DailyRecordForm
        date={date}
        totalSold={state.totalSold}
        additionalExpenses={state.additionalExpenses}
        profitPercent={state.profitPercent}
        notes={state.notes}
        dataphoneSales={state.dataphoneSales}
        grossProfit={state.previewProfit.grossProfit}
        netProfit={state.previewProfit.netProfit}
        investment={state.previewProfit.investment}
        saving={state.saving}
        error={state.error}
        notice={state.notice}
        onTotalSoldChange={state.setTotalSold}
        onAdditionalExpensesChange={state.setAdditionalExpenses}
        onProfitPercentChange={state.setProfitPercent}
        onNotesChange={state.setNotes}
        onDataphoneSalesChange={state.setDataphoneSales}
        onNoticeHide={() => state.setNotice(null)}
        onSave={state.save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    gap: 10,
  },
  muted: {},
  error: {
    fontWeight: '700',
  },
});
