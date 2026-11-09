import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { monthKey } from "../../../../core/utils/date";
import { dailyRecordService } from "../../infrastructure/container";
import { loadMonthlyBoundaryAwareRecords } from "../calendar/monthlyCalendarBoundary";
import { createFocusRefreshGuard } from "../../../../core/utils/focusRefreshGuard";
import {
  buildMonthlyCalendarLoadStartState,
  createInitialMonthlyCalendarRecordsState,
  MonthlyCalendarMonthCache,
  MonthlyCalendarRecordsState,
  shouldSurfaceMonthlyCalendarError,
  upsertMonthlyCalendarCache,
} from "./monthlyCalendarRecordsState";

interface UseMonthlyCalendarRecordsResult extends MonthlyCalendarRecordsState {
  refresh: () => Promise<void>;
}

export function useMonthlyCalendarRecords(visibleMonth: Date): UseMonthlyCalendarRecordsResult {
  const [state, setState] = useState<MonthlyCalendarRecordsState>(
    createInitialMonthlyCalendarRecordsState,
  );
  const shouldRefreshOnFocus = useMemo(createFocusRefreshGuard, []);
  const latestRequestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const monthCacheRef = useRef<MonthlyCalendarMonthCache>(new Map());

  const load = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    const visibleMonthKey = monthKey(visibleMonth);
    const cachedMonthRecords = monthCacheRef.current.get(visibleMonthKey);

    setState(
      buildMonthlyCalendarLoadStartState(
        hasLoadedOnceRef.current,
        cachedMonthRecords,
      ),
    );

    try {
      const { recordsByIso } = await loadMonthlyBoundaryAwareRecords(
        visibleMonth,
        (month) => dailyRecordService.getMonthlyOverview(month),
      );

      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      monthCacheRef.current = upsertMonthlyCalendarCache(monthCacheRef.current, visibleMonthKey, recordsByIso);
      hasLoadedOnceRef.current = true;

      setState({
        loading: false,
        refreshing: false,
        error: null,
        recordsByIso,
      });
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message.trim().length > 0
          ? cause.message
          : "No se pudo cargar el calendario.";

      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      if (shouldSurfaceMonthlyCalendarError(hasLoadedOnceRef.current, cachedMonthRecords)) {
        setState({
          loading: false,
          refreshing: false,
          error: message,
          recordsByIso: new Map(),
        });

        return;
      }

      setState((prev) => ({
        loading: false,
        refreshing: false,
        error: null,
        recordsByIso: cachedMonthRecords ? new Map(cachedMonthRecords) : prev.recordsByIso,
      }));
    }
  }, [visibleMonth]);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshOnFocus()) {
        void loadRef.current();
      }
    }, [shouldRefreshOnFocus]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    refresh: load,
  };
}
