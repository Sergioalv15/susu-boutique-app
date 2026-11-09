import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { createFocusRefreshGuard } from '../../../../core/utils/focusRefreshGuard';
import { createLatestWins } from '../../../../core/utils/latestWins';
import { Supplier } from '../../domain/types';
import { supplierService } from '../../infrastructure/container';

interface UseSuppliersState {
  loading: boolean;
  suppliers: Supplier[];
  error: string | null;
}

export function useSuppliers() {
  const [state, setState] = useState<UseSuppliersState>({
    loading: true,
    suppliers: [],
    error: null,
  });

  const shouldRefreshOnFocus = useMemo(createFocusRefreshGuard, []);
  const loadEpoch = useMemo(createLatestWins, []);

  const load = useCallback(async () => {
    const epoch = loadEpoch.begin();

    try {
      const suppliers = await supplierService.list();
      if (!loadEpoch.isCurrent(epoch)) {
        return;
      }
      setState({ loading: false, suppliers, error: null });
    } catch (cause) {
      if (!loadEpoch.isCurrent(epoch)) {
        return;
      }
      const message =
        cause instanceof Error && cause.message.trim().length > 0
          ? cause.message
          : 'Could not load suppliers';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: __DEV__ ? message : 'No se pudieron cargar los proveedores.',
      }));
    }
  }, [loadEpoch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      loadEpoch.invalidate();
    };
  }, [loadEpoch]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshOnFocus()) {
        void load();
      }
    }, [load, shouldRefreshOnFocus]),
  );

  return { ...state, refresh: load };
}