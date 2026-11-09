import { describe, expect, it } from 'vitest';
import {
  createMonthlyOverviewRefresher,
  UseMonthlyOverviewState,
} from './monthlyOverviewState';

function createOverview(month: string) {
  return {
    month,
    totalSold: 400,
    totalInvested: 190,
    totalAdditionalExpenses: 30,
    grossProfit: 210,
    netProfit: 180,
    averageDailyNetProfit: 90,
    estimatedSalary: 5400,
    trackedDays: 2,
    totalDataphoneSales: 0,
  };
}

function createStateHarness(initial: UseMonthlyOverviewState) {
  let state = initial;

  const setState = (
    next: UseMonthlyOverviewState | ((prev: UseMonthlyOverviewState) => UseMonthlyOverviewState)
  ) => {
    state = typeof next === 'function' ? (next as (prev: UseMonthlyOverviewState) => UseMonthlyOverviewState)(state) : next;
  };

  return {
    getState: () => state,
    setState,
  };
}

describe('createMonthlyOverviewRefresher', () => {
  it('loads overview and clears previous error', async () => {
    const stateHarness = createStateHarness({
      loading: false,
      overview: null,
      records: [],
      error: {
        userMessage: 'old',
        technicalMessage: 'old',
      },
    });

    const refresher = createMonthlyOverviewRefresher(
      {
        getMonthlyOverview: async () => ({
          overview: createOverview('2026-07'),
          records: [{ date: '2026-07-01', totalSold: 100, additionalExpenses: 10, profitPercent: 0.3, notes: '' }],
        }),
      },
      stateHarness.setState,
      new Date(2026, 6, 1)
    );

    await refresher();

    expect(stateHarness.getState()).toEqual({
      loading: false,
      overview: createOverview('2026-07'),
      records: [{ date: '2026-07-01', totalSold: 100, additionalExpenses: 10, profitPercent: 0.3, notes: '' }],
      error: null,
    });
  });

  it('keeps previous data and exposes technical failure details', async () => {
    const stateHarness = createStateHarness({
      loading: false,
      overview: createOverview('2026-07'),
      records: [{ date: '2026-07-01', totalSold: 100, additionalExpenses: 10, profitPercent: 0.3, notes: '' }],
      error: null,
    });

    const refresher = createMonthlyOverviewRefresher(
      {
        getMonthlyOverview: async () => {
          throw new Error('sqlite locked');
        },
      },
      stateHarness.setState,
      new Date(2026, 6, 1)
    );

    await refresher();

    expect(stateHarness.getState()).toEqual({
      loading: false,
      overview: createOverview('2026-07'),
      records: [{ date: '2026-07-01', totalSold: 100, additionalExpenses: 10, profitPercent: 0.3, notes: '' }],
      error: {
        userMessage: 'No se pudo cargar el inicio.',
        technicalMessage: 'sqlite locked',
      },
    });
  });
});
