import { HolidayRepository } from './HolidayRepository';
import { HolidayApi } from '../infrastructure/HolidayApiService';
import { getDatabaseGeneration } from '../../../core/storage/databaseCoordinator';

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface HolidaySyncResult {
  synced: boolean;
  error: string | null;
}

export class HolidaySyncService {
  constructor(
    private readonly repository: HolidayRepository,
    private readonly api: HolidayApi
  ) {}

  private pendingSync: Promise<HolidaySyncResult> | null = null;
  private readonly pendingYearSyncs = new Map<string, Promise<HolidaySyncResult>>();
  private readonly completedYearSyncs = new Set<string>();

  async syncSilently(now = new Date()): Promise<HolidaySyncResult> {
    if (this.pendingSync) {
      return this.pendingSync;
    }

    const shouldSync = await this.needsSync(now);
    if (!shouldSync) {
      return { synced: false, error: null };
    }

    if (this.pendingSync) {
      return this.pendingSync;
    }

    const years = [now.getFullYear(), now.getFullYear() + 1];
    const run = this.performSync(years, now);
    this.pendingSync = run.then(
      (result) => {
        this.pendingSync = null;
        return result;
      },
      (error) => {
        this.pendingSync = null;
        throw error;
      }
    );
    return this.pendingSync;
  }

  async syncYears(years: number[]): Promise<HolidaySyncResult> {
    const requestedYears = [...new Set(years)].sort((left, right) => left - right);
    const key = requestedYears.join(',');
    if (this.completedYearSyncs.has(key)) {
      return { synced: false, error: null };
    }
    const pending = this.pendingYearSyncs.get(key);
    if (pending) {
      return pending;
    }

    const run = this.performSync(requestedYears, null);
    this.pendingYearSyncs.set(key, run);
    try {
      const result = await run;
      if (result.synced) {
        this.completedYearSyncs.add(key);
      }
      return result;
    } finally {
      if (this.pendingYearSyncs.get(key) === run) {
        this.pendingYearSyncs.delete(key);
      }
    }
  }

  private async performSync(
    years: number[],
    now: Date | null
  ): Promise<HolidaySyncResult> {
    try {
      const generation = getDatabaseGeneration();
      const holidays = await this.api.fetchNationalHolidays(years);
      const applied = await this.repository.applySync(
        holidays,
        now?.toISOString() ?? null,
        generation,
      );
      return { synced: applied, error: null };
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message.trim().length > 0
          ? cause.message
          : 'Unknown holiday sync failure';
      return { synced: false, error: message };
    }
  }

  private async needsSync(now: Date): Promise<boolean> {
    const lastSync = await this.repository.getLastSync();
    if (!lastSync) {
      return true;
    }

    const lastSyncTime = new Date(lastSync).getTime();
    if (Number.isNaN(lastSyncTime)) {
      return true;
    }

    return now.getTime() - lastSyncTime >= SYNC_INTERVAL_MS;
  }
}
