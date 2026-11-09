import { useCallback, useEffect, useState } from 'react';
import { investmentBalanceService } from '../../../infrastructure/container';

export interface InvestmentBalanceState {
  loading: boolean;
  available: number;
  adjustmentsTotal: number;
  investedTotal: number;
  purchasesTotal: number;
  error: string | null;
  adding: boolean;
  addError: string | null;
}

export function useInvestmentBalance() {
  const [state, setState] = useState<InvestmentBalanceState>({
    loading: true,
    available: 0,
    adjustmentsTotal: 0,
    investedTotal: 0,
    purchasesTotal: 0,
    error: null,
    adding: false,
    addError: null,
  });

  const refresh = useCallback(async () => {
    try {
      const balance = await investmentBalanceService.getBalance();
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        available: balance.available,
        adjustmentsTotal: balance.adjustmentsTotal,
        investedTotal: balance.investedTotal,
        purchasesTotal: balance.purchasesTotal,
      }));
    } catch (cause) {
      const technicalMessage =
        cause instanceof Error && cause.message.trim().length > 0
          ? cause.message
          : 'Could not load investment balance';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'No se pudo cargar el capital para invertir.',
        ...(__DEV__ ? { addError: technicalMessage } : {}),
      }));
    }
  }, []);

  const addAdjustment = useCallback(
    async (input: { date: string; amount: number; note: string }) => {
      setState((prev) => ({ ...prev, adding: true, addError: null }));

      try {
        await investmentBalanceService.addAdjustment(input);
        await refresh();
        setState((prev) => ({ ...prev, adding: false }));
        return true;
      } catch (cause) {
        setState((prev) => ({
          ...prev,
          adding: false,
          addError: 'No se pudo guardar el ajuste.',
        }));
        return false;
      }
    },
    [refresh]
  );

  const addPurchase = useCallback(
    async (input: { date: string; amount: number; note: string; supplierId?: number | null }) => {
      setState((prev) => ({ ...prev, adding: true, addError: null }));

      try {
        await investmentBalanceService.addPurchase(input);
        await refresh();
        setState((prev) => ({ ...prev, adding: false }));
        return true;
      } catch (cause) {
        setState((prev) => ({
          ...prev,
          adding: false,
          addError: 'No se pudo guardar la compra.',
        }));
        return false;
      }
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
    addAdjustment,
    addPurchase,
  };
}