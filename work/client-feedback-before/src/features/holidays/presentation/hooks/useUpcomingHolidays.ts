import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { toIsoDate } from '../../../../core/utils/date';
import { createFocusRefreshGuard } from '../../../../core/utils/focusRefreshGuard';
import { UpcomingHoliday } from '../../domain/types';
import { refreshUpcomingHolidays } from '../../application/upcomingRefresh';
import { holidayRepository, holidaySyncService } from '../../infrastructure/container';
import { onHolidaysSynced, notifyHolidaysSynced } from '../holidaySyncEvents';

export { holidaysByIso } from '../../domain/holidaysByIso';

interface UseUpcomingHolidaysState {
  loading: boolean;
  holidays: UpcomingHoliday[];
  error: string | null;
}

export function useUpcomingHolidays(withinDays = 14, limit = 3) {
  const [state, setState] = useState<UseUpcomingHolidaysState>({
    loading: true,
    holidays: [],
    error: null,
  });

  const shouldRefreshOnFocus = useMemo(createFocusRefreshGuard, []);

  const refresh = useCallback(
    async (now = new Date()) => {
      try {
        const result = await refreshUpcomingHolidays(
          {
            getAll: () => holidayRepository.getAll(),
            syncSilently: (at) => holidaySyncService.syncSilently(at),
          },
          now,
          withinDays,
          limit,
          notifyHolidaysSynced
        );

        setState({
          loading: false,
          holidays: result.holidays,
          error: result.error,
        });
      } catch {
        setState((prev) => ({
          loading: false,
          holidays: prev.holidays,
          error: 'No se pudieron cargar los próximos festivos.',
        }));
      }
    },
    [limit, withinDays]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return onHolidaysSynced(() => {
      void refresh();
    });
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshOnFocus()) {
        void refresh();
      }
    }, [refresh, shouldRefreshOnFocus])
  );

  return { ...state, refresh };
}

export function upcomingHolidayKey(date: Date): string {
  return toIsoDate(date);
}