import { monthKey } from '../../../core/utils/date';
import { computeDailyProfit, computeMonthlyOverview } from '../domain/calculators';
import { validateAndNormalizeDailyRecord } from '../domain/validation';
import { DailyRecordRepository } from './DailyRecordRepository';
import { DailyRecordFormData, DailyRecordViewModel, MonthlyOverviewViewModel } from './dto';

function parseAmount(value: string): number {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) {
    return 0;
  }
  return Number(normalized);
}

function parsePercent(value: string): number {
  const amount = parseAmount(value);
  return amount / 100;
}

export class DailyRecordService {
  constructor(private readonly repository: DailyRecordRepository) {}

  async saveFromForm(data: DailyRecordFormData): Promise<DailyRecordViewModel> {
    const normalized = validateAndNormalizeDailyRecord({
      date: data.date,
      totalSold: parseAmount(data.totalSold),
      additionalExpenses: parseAmount(data.additionalExpenses),
      profitPercent: parsePercent(data.profitPercent),
      notes: data.notes,
      dataphoneSales: parseAmount(data.dataphoneSales),
    });

    await this.repository.upsert(normalized);

    return {
      record: normalized,
      profit: computeDailyProfit(normalized),
    };
  }

  async getDailyRecord(date: string): Promise<DailyRecordViewModel> {
    const record = await this.repository.findByDate(date);
    if (!record) {
      return {
        record: null,
        profit: {
          grossProfit: 0,
          netProfit: 0,
          investment: 0,
        },
      };
    }

    return {
      record,
      profit: computeDailyProfit(record),
    };
  }

  async getMonthlyOverview(date = new Date()): Promise<MonthlyOverviewViewModel> {
    const month = monthKey(date);
    const records = await this.repository.findByMonth(month);
    const overview = computeMonthlyOverview(month, records);

    return {
      records,
      overview,
    };
  }
}
