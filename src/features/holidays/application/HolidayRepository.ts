import { Holiday } from '../domain/types';

export interface HolidayRepository {
  upsertMany(holidays: Holiday[]): Promise<void>;
  listBetween(startDate: string, endDate: string): Promise<Holiday[]>;
  getAll(): Promise<Holiday[]>;
  getLastSync(): Promise<string | null>;
  setLastSync(timestamp: string): Promise<void>;
  applySync(holidays: Holiday[], timestamp: string | null, generation: number): Promise<boolean>;
}
