import { Holiday } from '../domain/types';
import { HolidaySyncResult } from './HolidaySyncService';

export interface CalendarHolidaysLoadDeps {
  listBetween(startIso: string, endIso: string): Promise<Holiday[]>;
  syncYears(years: number[]): Promise<HolidaySyncResult>;
}

export interface CalendarHolidaysLoadResult {
  holidays: Holiday[];
  error: string | null;
  yearRequested: boolean;
}

export async function loadCalendarHolidaysWithYearCoverage(
  deps: CalendarHolidaysLoadDeps,
  year: number,
  startIso: string,
  endIso: string
): Promise<CalendarHolidaysLoadResult> {
  const rows = await deps.listBetween(startIso, endIso);
  if (rows.length > 0) {
    return { holidays: rows, error: null, yearRequested: false };
  }

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const yearRows = await deps.listBetween(yearStart, yearEnd);
  if (yearRows.length > 0) {
    return { holidays: [], error: null, yearRequested: false };
  }

  const sync = await deps.syncYears([year]);
  const holidays = await deps.listBetween(startIso, endIso);

  return { holidays, error: sync.error, yearRequested: true };
}