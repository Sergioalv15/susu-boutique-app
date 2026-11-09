import { describe, expect, it } from 'vitest';
import { DailyRecordService } from '../../application/DailyRecordService';
import { DailyRecordRepository } from '../../application/DailyRecordRepository';
import { DailyRecord } from '../../domain/types';
import { formatProfitPercentForForm } from './dailyRecordForm';

class InMemoryDailyRecordRepository implements DailyRecordRepository {
  private readonly records = new Map<string, DailyRecord>();

  async upsert(record: DailyRecord): Promise<void> {
    this.records.set(record.date, record);
  }

  async findByDate(date: string): Promise<DailyRecord | null> {
    return this.records.get(date) ?? null;
  }

  async findByMonth(month: string): Promise<DailyRecord[]> {
    return [...this.records.values()].filter((record) => record.date.startsWith(month));
  }

  async sumInvestmentCost(): Promise<number> {
    return 0;
  }
}

describe('formatProfitPercentForForm', () => {
  it('preserves the supported four-decimal stored proportion as an editable percentage', () => {
    expect(formatProfitPercentForForm(0.304)).toBe('30.4');
    expect(formatProfitPercentForForm(0.3033)).toBe('30.33');
  });

  it('keeps a fractional margin after opening, editing another field, and saving again', async () => {
    const repository = new InMemoryDailyRecordRepository();
    const service = new DailyRecordService(repository);
    const original = {
      date: '2026-09-21',
      totalSold: '1000',
      additionalExpenses: '0',
      profitPercent: '30.4',
      notes: 'before edit',
      dataphoneSales: '',
    };

    await service.saveFromForm(original);
    const opened = await service.getDailyRecord(original.date);
    const resaved = await service.saveFromForm({
      ...original,
      profitPercent: formatProfitPercentForForm(opened.record!.profitPercent),
      notes: 'unrelated edit',
    });

    expect(resaved.record!.profitPercent).toBe(0.304);
    expect(resaved.profit.grossProfit).toBe(304);
    expect(resaved.profit.investment).toBe(696);
  });
});
