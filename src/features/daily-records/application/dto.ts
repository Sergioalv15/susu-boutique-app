import { DailyRecord, DailyProfit, MonthlyOverview } from '../domain/types';

export interface DailyRecordFormData {
  date: string;
  totalSold: string;
  additionalExpenses: string;
  profitPercent: string;
  notes: string;
  dataphoneSales: string;
}

export interface DailyRecordViewModel {
  record: DailyRecord | null;
  profit: DailyProfit;
}

export interface MonthlyOverviewViewModel {
  overview: MonthlyOverview;
  records: DailyRecord[];
}