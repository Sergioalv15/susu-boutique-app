import { Holiday } from '../domain/types';
import { UpcomingHoliday } from '../domain/types';
import { computeUpcomingHolidays } from '../domain/upcoming';
import { HolidaySyncResult } from './HolidaySyncService';

export interface UpcomingHolidaysRefreshDeps {
  getAll(): Promise<Holiday[]>;
  syncSilently(now?: Date): Promise<HolidaySyncResult>;
}

export interface UpcomingHolidaysRefreshResult {
  holidays: UpcomingHoliday[];
  error: string | null;
}

export async function refreshUpcomingHolidays(
  deps: UpcomingHolidaysRefreshDeps,
  now: Date,
  withinDays: number,
  limit: number,
  onSynced?: () => void
): Promise<UpcomingHolidaysRefreshResult> {
  const sync = await deps.syncSilently(now);
  if (sync.synced) {
    onSynced?.();
  }

  const all = await deps.getAll();
  const upcoming = computeUpcomingHolidays(all, now, withinDays).slice(0, limit);

  return { holidays: upcoming, error: sync.error };
}