import { describe, expect, it } from 'vitest';
import { DailyRecordService } from './DailyRecordService';
import { DailyRecordRepository } from './DailyRecordRepository';
import { DailyRecord } from '../domain/types';

class InMemoryDailyRecordRepository implements DailyRecordRepository {
  private readonly map = new Map<string, DailyRecord>();

  async upsert(record: DailyRecord): Promise<void> {
    this.map.set(record.date, record);
  }

  async findByDate(date: string): Promise<DailyRecord | null> {
    return this.map.get(date) ?? null;
  }

  async findMostRecentOnOrBefore(date: string): Promise<DailyRecord | null> {
    return [...this.map.values()]
      .filter((record) => record.date <= date)
      .sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
  }

  async findByMonth(month: string): Promise<DailyRecord[]> {
    return [...this.map.values()]
      .filter((item) => item.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async sumInvestmentCost(): Promise<number> {
    return [...this.map.values()].reduce(
      (sum, item) => sum + item.totalSold * (1 - item.profitPercent),
      0
    );
  }
}

describe('DailyRecordService', () => {
  it('saves normalized records from form input with comma decimals', async () => {
    const repo = new InMemoryDailyRecordRepository();
    const service = new DailyRecordService(repo);

    const result = await service.saveFromForm({
      date: '2026-07-12',
      totalSold: '230,50',
      additionalExpenses: '10,2',
      profitPercent: '30',
      notes: '  market day ',
      dataphoneSales: '80,5',
    });

    expect(result.record).toEqual({
      date: '2026-07-12',
      totalSold: 230.5,
      additionalExpenses: 10.2,
      profitPercent: 0.3,
      notes: 'market day',
      dataphoneSales: 80.5,
    });
    expect(result.profit).toEqual({
      grossProfit: 69.15,
      netProfit: 58.95,
      investment: 161.35,
    });
  });

  it('returns zero profit when no record exists', async () => {
    const service = new DailyRecordService(new InMemoryDailyRecordRepository());

    const result = await service.getDailyRecord('2026-07-13');

    expect(result.record).toBeNull();
    expect(result.profit).toEqual({ grossProfit: 0, netProfit: 0, investment: 0 });
  });

  it('finds the most recent saved day across month and year boundaries without selecting future records', async () => {
    const repo = new InMemoryDailyRecordRepository();
    const service = new DailyRecordService(repo);
    for (const date of ['2025-12-31', '2026-01-02', '2026-02-01']) {
      await service.saveFromForm({
        date,
        totalSold: '100',
        additionalExpenses: '10',
        profitPercent: '30',
        notes: '',
        dataphoneSales: '20',
      });
    }

    const result = await service.getMostRecentDailyRecord('2026-01-01');

    expect(result.record?.date).toBe('2025-12-31');
    expect(result.profit).toEqual({ grossProfit: 30, netProfit: 20, investment: 70 });
  });

  it('returns an empty result when no saved day exists on or before the requested date', async () => {
    const repo = new InMemoryDailyRecordRepository();
    const service = new DailyRecordService(repo);
    await service.saveFromForm({
      date: '2026-01-02',
      totalSold: '100',
      additionalExpenses: '10',
      profitPercent: '30',
      notes: '',
      dataphoneSales: '',
    });

    const result = await service.getMostRecentDailyRecord('2026-01-01');

    expect(result.record).toBeNull();
    expect(result.profit).toEqual({ grossProfit: 0, netProfit: 0, investment: 0 });
  });

  it('builds monthly overview from persisted records', async () => {
    const repo = new InMemoryDailyRecordRepository();
    const service = new DailyRecordService(repo);

    await service.saveFromForm({
      date: '2026-07-01',
      totalSold: '100',
      additionalExpenses: '10',
      profitPercent: '30',
      notes: '',
      dataphoneSales: '20',
    });
    await service.saveFromForm({
      date: '2026-07-02',
      totalSold: '300',
      additionalExpenses: '20',
      profitPercent: '30',
      notes: '',
      dataphoneSales: '',
    });

    const result = await service.getMonthlyOverview(new Date(2026, 6, 25));

    expect(result.overview.month).toBe('2026-07');
    expect(result.records).toHaveLength(2);
    expect(result.overview.totalSold).toBe(400);
    expect(result.overview.totalInvested).toBe(280);
    expect(result.overview.totalAdditionalExpenses).toBe(30);
    expect(result.overview.grossProfit).toBe(120);
    expect(result.overview.netProfit).toBe(90);
    expect(result.overview.totalDataphoneSales).toBe(20);
  });
});
