import { useCallback, useEffect, useState } from 'react';
import { dailyRecordService } from '../../infrastructure/container';
import { createMonthlyOverviewRefresher, UseMonthlyOverviewState } from './monthlyOverviewState';

export function useMonthlyOverview(month: Date) {
  const [state, setState] = useState<UseMonthlyOverviewState>({
    loading: true,
    overview: null,
    records: [],
    error: null,
  });

  const refresh = useCallback(
    createMonthlyOverviewRefresher(dailyRecordService, setState, month),
    [month],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
