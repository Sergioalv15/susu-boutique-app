import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { monthKeysForWindow, parseIsoDate } from "../../../../core/utils/date";
import { dailyRecordService } from "../../infrastructure/container";
import { DailyRecord } from "../../domain/types";
import { createFocusRefreshGuard } from "../../../../core/utils/focusRefreshGuard";
import { createLatestAsyncLoadCoordinator } from "../../../../core/utils/latestWins";

interface BiweeklyRecordsState {
  loading: boolean;
  error: string | null;
  recordsByIso: Map<string, DailyRecord>;
}

interface UseBiweeklyRecordsResult extends BiweeklyRecordsState {
  refresh: () => Promise<void>;
}

function monthKeyToDate(monthKey: string): Date {
  return parseIsoDate(`${monthKey}-01`);
}

export function useBiweeklyRecords(windowStartIso: string): UseBiweeklyRecordsResult {
  const [state, setState] = useState<BiweeklyRecordsState>({
    loading: true,
    error: null,
    recordsByIso: new Map<string, DailyRecord>(),
  });

  const monthKeys = useMemo(
    () => monthKeysForWindow(windowStartIso),
    [windowStartIso],
  );
  const shouldRefreshOnFocus = useMemo(createFocusRefreshGuard, []);
  const loadCoordinator = useMemo(createLatestAsyncLoadCoordinator, []);

  const load = useCallback(async () => {
    await loadCoordinator.run(
      async () => {
        const monthResults = await Promise.all(
          monthKeys.map((monthKey) =>
            dailyRecordService.getMonthlyOverview(monthKeyToDate(monthKey)),
          ),
        );

        const merged = new Map<string, DailyRecord>();
        for (const result of monthResults) {
          for (const record of result.records) {
            merged.set(record.date, record);
          }
        }

        return merged;
      },
      {
        onStart: () => {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        },
        onSuccess: (recordsByIso) => {
          setState({ loading: false, error: null, recordsByIso });
        },
        onError: (cause) => {
          const message =
            cause instanceof Error && cause.message.trim().length > 0
              ? cause.message
              : "No se pudo cargar el calendario.";

          setState({
            loading: false,
            error: message,
            recordsByIso: new Map<string, DailyRecord>(),
          });
        },
      },
    );
  }, [loadCoordinator, monthKeys]);
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

  return {
    ...state,
    refresh: load,
  };
}
