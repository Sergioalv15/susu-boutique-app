import { describe, expect, it } from 'vitest';
import { computeDailyProfit, computeMonthlyOverview } from './calculators';
import { DailyRecord } from './types';

describe('computeDailyProfit', () => {
  it('computes net profit as percent of sales minus expenses', () => {
    const result = computeDailyProfit({
      totalSold: 1000,
      profitPercent: 0.3,
      additionalExpenses: 40,
    });

    expect(result).toEqual({
      grossProfit: 300,
      netProfit: 260,
      investment: 700,
    });
  });

  it('keeps net profit negative when expenses exceed the percent share', () => {
    const result = computeDailyProfit({
      totalSold: 120,
      profitPercent: 0.3,
      additionalExpenses: 60,
    });

    expect(result.grossProfit).toBe(36);
    expect(result.netProfit).toBe(-24);
  });

  it('rounds gross profit and net profit to cents', () => {
    const result = computeDailyProfit({
      totalSold: 100.23,
      profitPercent: 0.3,
      additionalExpenses: 7.5,
    });

    expect(result.grossProfit).toBe(30.07);
    expect(result.netProfit).toBe(22.57);
    expect(result.investment).toBe(70.16);
  });

  it('normalizes negative zero net profit to zero', () => {
    const result = computeDailyProfit({
      totalSold: 1000,
      profitPercent: 0.3,
      additionalExpenses: 300.004,
    });

    expect(result.grossProfit).toBe(300);
    expect(result.netProfit).toBe(0);
    expect(Object.is(result.netProfit, -0)).toBe(false);
  });
});

describe('computeMonthlyOverview', () => {
  const records: DailyRecord[] = [
    {
      date: '2026-07-01',
      totalSold: 200,
      additionalExpenses: 20,
      profitPercent: 0.3,
      notes: '',
    },
    {
      date: '2026-07-02',
      totalSold: 0,
      additionalExpenses: 0,
      profitPercent: 0.3,
      notes: '',
    },
    {
      date: '2026-07-03',
      totalSold: 350,
      additionalExpenses: 40,
      profitPercent: 0.3,
      notes: 'rainy day',
    },
  ];

  it('aggregates all monthly totals and derived values', () => {
    const result = computeMonthlyOverview('2026-07', records);

    expect(result.month).toBe('2026-07');
    expect(result.totalSold).toBe(550);
    expect(result.totalInvested).toBe(385);
    expect(result.totalAdditionalExpenses).toBe(60);
    expect(result.grossProfit).toBe(165);
    expect(result.netProfit).toBe(105);
    expect(result.averageDailyNetProfit).toBeCloseTo(35, 6);
    expect(result.estimatedSalary).toBe(165);
    expect(result.trackedDays).toBe(3);
  });

  it('returns zeroed derived values for empty months', () => {
    const result = computeMonthlyOverview('2026-08', []);

    expect(result.totalSold).toBe(0);
    expect(result.totalInvested).toBe(0);
    expect(result.totalAdditionalExpenses).toBe(0);
    expect(result.grossProfit).toBe(0);
    expect(result.netProfit).toBe(0);
    expect(result.averageDailyNetProfit).toBe(0);
    expect(result.estimatedSalary).toBe(0);
    expect(result.trackedDays).toBe(0);
    expect(result.totalDataphoneSales).toBe(0);
  });

  it('aggregates dataphone sales without affecting profit logic', () => {
    const records: DailyRecord[] = [
      {
        date: '2026-07-01',
        totalSold: 200,
        additionalExpenses: 20,
        profitPercent: 0.3,
        notes: '',
        dataphoneSales: 120,
      },
      {
        date: '2026-07-02',
        totalSold: 350,
        additionalExpenses: 40,
        profitPercent: 0.3,
        notes: '',
        dataphoneSales: 0,
      },
      {
        date: '2026-07-03',
        totalSold: 100,
        additionalExpenses: 10,
        profitPercent: 0.3,
        notes: '',
      },
    ];

    const result = computeMonthlyOverview('2026-07', records);

    expect(result.totalDataphoneSales).toBe(120);
    expect(result.totalSold).toBe(650);
    expect(result.grossProfit).toBe(195);
    expect(result.netProfit).toBe(125);
    expect(result.totalInvested).toBe(455);
  });

  it('includes loss days in monthly totals and averages', () => {
    const records: DailyRecord[] = [
      {
        date: '2026-07-01',
        totalSold: 200,
        additionalExpenses: 20,
        profitPercent: 0.3,
        notes: '',
      },
      {
        date: '2026-07-02',
        totalSold: 350,
        additionalExpenses: 40,
        profitPercent: 0.3,
        notes: '',
      },
      {
        date: '2026-07-03',
        totalSold: 100,
        additionalExpenses: 60,
        profitPercent: 0.3,
        notes: 'loss day',
      },
      {
        date: '2026-07-04',
        totalSold: 0,
        additionalExpenses: 0,
        profitPercent: 0.3,
        notes: '',
      },
    ];

    const result = computeMonthlyOverview('2026-07', records);

    expect(result.totalSold).toBe(650);
    expect(result.grossProfit).toBe(195);
    expect(result.netProfit).toBe(75);
    expect(result.totalAdditionalExpenses).toBe(120);
    expect(result.averageDailyNetProfit).toBeCloseTo(18.75, 6);
    expect(result.estimatedSalary).toBe(195);
    expect(result.trackedDays).toBe(4);
  });
});