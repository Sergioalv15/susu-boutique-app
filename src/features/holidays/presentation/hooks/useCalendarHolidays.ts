import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { toIsoDate } from "../../../../core/utils/date";
import { createFocusRefreshGuard } from "../../../../core/utils/focusRefreshGuard";
import { createLatestWins } from "../../../../core/utils/latestWins";
import { holidaysByIso as buildHolidaysByIso } from "../../domain/holidaysByIso";
import { loadCalendarHolidaysWithYearCoverage } from "../../application/calendarHolidaysLoad";
import { holidayRepository, holidaySyncService } from "../../infrastructure/container";
import { onHolidaysSynced } from "../holidaySyncEvents";

function monthRange(visibleMonth: Date): { startIso: string; endIso: string } {
  const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const end = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  return { startIso: toIsoDate(start), endIso: toIsoDate(end) };
}

interface CalendarHolidaysState {
  holidaysByIso: Map<string, string>;
  error: string | null;
}

export function useCalendarHolidays(
  visibleMonth: Date,
): { holidaysByIso: Map<string, string>; error: string | null } {
  const [state, setState] = useState<CalendarHolidaysState>({
    holidaysByIso: new Map(),
    error: null,
  });

  const shouldRefreshOnFocus = useMemo(createFocusRefreshGuard, []);
  const loadEpoch = useMemo(createLatestWins, []);

  const load = useCallback(async () => {
    const epoch = loadEpoch.begin();
    const { startIso, endIso } = monthRange(visibleMonth);

    try {
      const result = await loadCalendarHolidaysWithYearCoverage(
        {
          listBetween: (start, end) => holidayRepository.listBetween(start, end),
          syncYears: (years) => holidaySyncService.syncYears(years),
        },
        visibleMonth.getFullYear(),
        startIso,
        endIso
      );

      if (!loadEpoch.isCurrent(epoch)) {
        return;
      }
      setState({ holidaysByIso: buildHolidaysByIso(result.holidays), error: result.error });
    } catch {
      if (!loadEpoch.isCurrent(epoch)) {
        return;
      }
      setState((prev) => ({
        ...prev,
        error: "No se pudieron cargar los festivos del calendario.",
      }));
    }
  }, [visibleMonth, loadEpoch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return onHolidaysSynced(() => {
      void load();
    });
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshOnFocus()) {
        void load();
      }
    }, [load, shouldRefreshOnFocus])
  );

  useEffect(() => {
    return () => {
      loadEpoch.invalidate();
    };
  }, [loadEpoch]);

  return state;
}