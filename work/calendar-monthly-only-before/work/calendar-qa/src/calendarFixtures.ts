import { DailyRecord } from '../../../src/features/daily-records/domain/types';
import { biweekWindowDays, toIsoDate } from '../../../src/core/utils/date';

function makeRecord(date: string, index: number): DailyRecord {
  return {
    date,
    totalSold: 145 + index * 37,
    additionalExpenses: 9 + index * 4,
    profitPercent: 0.3,
    notes: 'Synthetic visual QA fixture',
  };
}

function recordsForMonth(visibleMonth: Date): Map<string, DailyRecord> {
  const days = [3, 6, 9, 13, 16, 20, 25];
  return new Map(
    days.map((day, index) => [
      toIsoDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)),
      makeRecord(
        toIsoDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)),
        index,
      ),
    ]),
  );
}

export function useMonthlyCalendarRecords(visibleMonth: Date) {
  return {
    loading: false,
    refreshing: false,
    error: null,
    recordsByIso: recordsForMonth(visibleMonth),
    refresh: async () => undefined,
  };
}

export function useBiweeklyRecords(windowStartIso: string) {
  const days = biweekWindowDays(windowStartIso);
  const recordsByIso = new Map<string, DailyRecord>();
  [1, 4, 7, 10, 12].forEach((dayIndex, index) => {
    const date = days[dayIndex];
    if (date) recordsByIso.set(date, makeRecord(date, index));
  });

  return { loading: false, error: null, recordsByIso, refresh: async () => undefined };
}

export function useCalendarHolidays(visibleMonth: Date) {
  const date = toIsoDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 15));
  return { holidaysByIso: new Map([[date, 'Festivo de muestra']]), error: null };
}
