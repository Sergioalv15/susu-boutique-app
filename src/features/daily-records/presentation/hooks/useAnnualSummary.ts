import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  createLatestAsyncLoadCoordinator,
} from "../../../../core/utils/latestWins";
import { createFocusRefreshGuard } from "../../../../core/utils/focusRefreshGuard";
import { MonthlyOverview } from "../../domain/types";
import { dailyRecordService } from "../../infrastructure/container";

export interface MonthAnnualSummary {
  month: Date;
  overview: MonthlyOverview;
}

export interface AnnualSummaryState {
  loading: boolean;
  monthlySummaries: MonthAnnualSummary[];
  error: string | null;
}

export function buildMonthDatesForYear(year: number): Date[] {
  return Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));
}

export async function fetchAnnualMonthSummaries(
  year: number,
): Promise<MonthAnnualSummary[]> {
  const months = buildMonthDatesForYear(year);
  return Promise.all(
    months.map(async (month) => {
      const data = await dailyRecordService.getMonthlyOverview(month);
      return { month, overview: data.overview };
    }),
  );
}

export function useAnnualSummary(year: number): AnnualSummaryState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<AnnualSummaryState>({
    loading: true,
    monthlySummaries: [],
    error: null,
  });
  const loadCoordinator = useMemo(createLatestAsyncLoadCoordinator, []);
  const shouldRefreshOnFocus = useMemo(createFocusRefreshGuard, []);

  const load = useCallback(async () => {
    await loadCoordinator.run(
      () => fetchAnnualMonthSummaries(year),
      {
        onStart: () => {
          setState({ loading: true, monthlySummaries: [], error: null });
        },
        onSuccess: (monthlySummaries) => {
          setState({ loading: false, monthlySummaries, error: null });
        },
        onError: () => {
          setState({
            loading: false,
            monthlySummaries: [],
            error: "No se pudo cargar el resumen anual.",
          });
        },
      },
    );
  }, [loadCoordinator, year]);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshOnFocus()) {
        void loadRef.current();
      }

      return () => loadCoordinator.invalidate();
    }, [loadCoordinator, shouldRefreshOnFocus]),
  );

  useEffect(() => {
    void load();
    return () => loadCoordinator.invalidate();
  }, [load, loadCoordinator]);

  return { ...state, refresh: load };
}
