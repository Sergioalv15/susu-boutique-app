import { Holiday } from '../domain/types';
import { UpcomingHoliday } from '../domain/types';
import { computeUpcomingHolidays } from '../domain/upcoming';
import { HolidaySyncResult } from './HolidaySyncService';

export interface UpcomingHolidaysRefreshDeps {
  getAll(): Promise<Holiday[]>;
  syncSilently(now?: Date): Promise<HolidaySyncResult>;
  syncYears(years: number[]): Promise<HolidaySyncResult>;
}

export interface UpcomingHolidaysRefreshResult {
  holidays: UpcomingHoliday[];
  error: string | null;
}

export async function refreshUpcomingHolidays(
  deps: UpcomingHolidaysRefreshDeps,
  now: Date,
  withinDays: number | null,
  limit: number,
  onSynced?: () => void
): Promise<UpcomingHolidaysRefreshResult> {
  const sync = await deps.syncSilently(now);
  if (sync.synced) {
    onSynced?.();
  }

  let all = await deps.getAll();
  let error = sync.error;
  if (
    withinDays === null &&
    !sync.synced &&
    !sync.error &&
    ![now.getFullYear(), now.getFullYear() + 1].every((year) =>
      all.some((holiday) => holiday.date.startsWith(String(year)))
    )
  ) {
    const nextYearSync = await deps.syncYears([now.getFullYear(), now.getFullYear() + 1]);
    if (nextYearSync.synced) {
      onSynced?.();
    }
    error = nextYearSync.error;
    all = await deps.getAll();
  }
  const upcoming = computeUpcomingHolidays(all, now, withinDays).slice(0, limit);

  return { holidays: upcoming, error };
}
