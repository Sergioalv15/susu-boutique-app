import { describe, expect, it } from 'vitest';
import { DailyRecordRepository } from '../../application/DailyRecordRepository';
import { DailyRecord } from '../../domain/types';
import { InvestmentAdjustment, InvestmentHistoryItem, InvestmentType } from '../domain/types';
import { InvestmentAdjustmentRepository } from './InvestmentAdjustmentRepository';
import { InvestmentBalanceService } from './InvestmentBalanceService';

class FakeDailyRecordRepository implements DailyRecordRepository {
  records: DailyRecord[] = [];

  async upsert(record: DailyRecord): Promise<void> {
    this.records.push(record);
  }
  async findByDate(date: string): Promise<DailyRecord | null> {
    return this.records.find((r) => r.date === date) ?? null;
  }
  async findByMonth(month: string): Promise<DailyRecord[]> {
    return this.records.filter((r) => r.date.startsWith(month));
  }
  async sumInvestmentCost(): Promise<number> {
    return this.records.reduce((sum, r) => sum + r.totalSold * (1 - r.profitPercent), 0);
  }
}

class FakeAdjustmentRepository implements InvestmentAdjustmentRepository {
  adjustments: InvestmentAdjustment[] = [];
  nextId = 1;

  async add(input: {
    date: string;
    amount: number;
    note: string;
    type?: InvestmentType;
    supplierId?: number | null;
  }): Promise<InvestmentAdjustment> {
    const item: InvestmentAdjustment = {
      id: this.nextId++,
      date: input.date,
      amount: input.amount,
      note: input.note,
      type: input.type ?? 'ajuste',
      supplierId: input.supplierId ?? null,
    };
    this.adjustments.push(item);
    return item;
  }
  async listAll(types?: InvestmentType[]): Promise<InvestmentAdjustment[]> {
    if (!types || types.length === 0) {
      return [...this.adjustments];
    }
    return this.adjustments.filter((a) => types.includes(a.type));
  }
  async listHistory(): Promise<InvestmentHistoryItem[]> {
    return [];
  }
  async sumAmount(): Promise<number> {
    return this.adjustments
      .filter((a) => a.type === 'ajuste')
      .reduce((sum, a) => sum + a.amount, 0);
  }
  async sumPurchases(): Promise<number> {
    return this.adjustments
      .filter((a) => a.type === 'compra')
      .reduce((sum, a) => sum + a.amount, 0);
  }
}

describe('InvestmentBalanceService', () => {
  it('includes daily record investment costs across all months', async () => {
    const records = new FakeDailyRecordRepository();
    records.records = [
      { date: '2026-06-01', totalSold: 100, additionalExpenses: 5, profitPercent: 0.3, notes: '' },
      { date: '2026-07-15', totalSold: 200, additionalExpenses: 10, profitPercent: 0.3, notes: '' },
    ];
    const service = new InvestmentBalanceService(new FakeAdjustmentRepository(), records);

    const balance = await service.getBalance();

    expect(balance.investedTotal).toBe(210);
    expect(balance.adjustmentsTotal).toBe(0);
    expect(balance.purchasesTotal).toBe(0);
    expect(balance.available).toBe(210);
  });

  it('combines manual adjustments with daily record investment costs', async () => {
    const records = new FakeDailyRecordRepository();
    records.records = [
      { date: '2026-07-01', totalSold: 100, additionalExpenses: 5, profitPercent: 0.3, notes: '' },
    ];
    const adjustments = new FakeAdjustmentRepository();
    await adjustments.add({ date: '2026-07-10', amount: 200, note: 'initial capital' });
    await adjustments.add({ date: '2026-07-11', amount: -50, note: 'withdraw' });

    const service = new InvestmentBalanceService(adjustments, records);
    const balance = await service.getBalance();

    expect(balance.adjustmentsTotal).toBe(150);
    expect(balance.investedTotal).toBe(70);
    expect(balance.purchasesTotal).toBe(0);
    expect(balance.available).toBe(220);
  });

  it('subtracts supplier purchases from available capital', async () => {
    const records = new FakeDailyRecordRepository();
    records.records = [
      { date: '2026-07-01', totalSold: 100, additionalExpenses: 5, profitPercent: 0.3, notes: '' },
    ];
    const adjustments = new FakeAdjustmentRepository();
    await adjustments.add({ date: '2026-07-10', amount: 200, note: 'initial capital' });
    await adjustments.add({
      date: '2026-07-12',
      amount: 80,
      note: 'compra a proveedor',
      type: 'compra',
      supplierId: 3,
    });

    const service = new InvestmentBalanceService(adjustments, records);
    const balance = await service.getBalance();

    expect(balance.adjustmentsTotal).toBe(200);
    expect(balance.purchasesTotal).toBe(80);
    expect(balance.investedTotal).toBe(70);
    expect(balance.available).toBe(190);
  });

  it('addPurchase stores amount as positive compra', async () => {
    const adjustments = new FakeAdjustmentRepository();
    const service = new InvestmentBalanceService(adjustments, new FakeDailyRecordRepository());

    await service.addPurchase({
      date: '2026-07-12',
      amount: 80,
      note: 'tela',
      supplierId: 3,
    });

    const purchases = await adjustments.listAll(['compra']);
    expect(purchases).toHaveLength(1);
    expect(purchases[0].amount).toBe(80);
    expect(purchases[0].supplierId).toBe(3);
    expect(purchases[0].type).toBe('compra');
  });
});