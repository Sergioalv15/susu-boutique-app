import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/ui/components/Screen';
import { InvestmentPurchaseModal } from '../../src/features/daily-records/investment/presentation/components/InvestmentPurchaseModal';
import { investmentBalanceService } from '../../src/features/daily-records/infrastructure/container';
import { isValidIsoDate, toIsoDate } from '../../src/core/utils/date';
import { createInvestmentPurchaseCloseHandler } from '../../src/features/daily-records/investment/presentation/investmentPurchaseNavigation';

export default function InvestmentPurchaseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const [saving, setSaving] = useState(false);
  const closePurchase = useMemo(
    () =>
      createInvestmentPurchaseCloseHandler({
        canGoBack: () => router.canGoBack(),
        back: () => router.back(),
        replaceCalendar: () => router.replace('/calendar'),
      }),
    [router],
  );

  const initialDate =
    typeof params.date === 'string' && isValidIsoDate(params.date)
      ? params.date
      : toIsoDate(new Date());

  const handleSubmit = async (input: {
    date: string;
    amount: string;
    note: string;
    supplierId: number | null;
  }) => {
    if (!input.supplierId) {
      Alert.alert('Proveedor requerido', 'Seleccioná un proveedor.');
      return false;
    }
    const parsed = Number(input.amount) || 0;
    if (parsed <= 0) {
      Alert.alert('Monto inválido', 'El monto debe ser mayor a 0.');
      return false;
    }

    setSaving(true);
    try {
      await investmentBalanceService.addPurchase({
        date: input.date || toIsoDate(new Date()),
        amount: parsed,
        note: input.note,
        supplierId: input.supplierId,
      });
      return true;
    } catch {
      Alert.alert('Error', 'No se pudo guardar la inversión.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <InvestmentPurchaseModal
        visible={true}
        saving={saving}
        defaultDate={initialDate}
        showTitle={false}
        onClose={closePurchase}
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}

