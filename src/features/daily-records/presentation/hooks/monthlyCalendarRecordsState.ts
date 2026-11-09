import { DailyRecord } from "../../domain/types";

export interface MonthlyCalendarRecordsState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  recordsByIso: Map<string, DailyRecord>;
}

export type MonthlyCalendarMonthCache = Map<string, Map<string, DailyRecord>>;

const MONTHLY_CALENDAR_CACHE_LIMIT = 6;

export function createInitialMonthlyCalendarRecordsState(): MonthlyCalendarRecordsState {
  return {
    loading: true,
    refreshing: false,
    error: null,
    recordsByIso: new Map<string, DailyRecord>(),
  };
}

export function buildMonthlyCalendarLoadStartState(
  hasLoadedOnce: boolean,
  cachedMonthRecords?: Map<string, DailyRecord>,
): MonthlyCalendarRecordsState {
  const hasCache = Boolean(cachedMonthRecords);
  const shouldBlock = !hasLoadedOnce && !hasCache;

  return {
    loading: shouldBlock,
    refreshing: !shouldBlock,
    error: null,
    recordsByIso: cachedMonthRecords
      ? new Map(cachedMonthRecords)
      : new Map<string, DailyRecord>(),
  };
}

export function shouldSurfaceMonthlyCalendarError(
  hasLoadedOnce: boolean,
  cachedMonthRecords?: Map<string, DailyRecord>,
): boolean {
  return !hasLoadedOnce && !cachedMonthRecords;
}

export function upsertMonthlyCalendarCache(
  cache: MonthlyCalendarMonthCache,
  month: string,
  recordsByIso: Map<string, DailyRecord>,
  limit = MONTHLY_CALENDAR_CACHE_LIMIT,
): MonthlyCalendarMonthCache {
  const next = new Map(cache);

  if (next.has(month)) {
    next.delete(month);
  }

  next.set(month, new Map(recordsByIso));

  while (next.size > limit) {
    const oldestMonth = next.keys().next().value;
    if (!oldestMonth) {
      break;
    }
    next.delete(oldestMonth);
  }

  return next;
}
