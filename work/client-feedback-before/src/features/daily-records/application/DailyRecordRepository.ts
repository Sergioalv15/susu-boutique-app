import { DailyRecord } from '../domain/types';

export interface DailyRecordRepository {
  upsert(record: DailyRecord): Promise<void>;
  findByDate(date: string): Promise<DailyRecord | null>;
  findByMonth(month: string): Promise<DailyRecord[]>;
  sumInvestmentCost(): Promise<number>;
}
