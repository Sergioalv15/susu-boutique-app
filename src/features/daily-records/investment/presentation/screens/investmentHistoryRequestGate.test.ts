import { describe, expect, it } from 'vitest';
import { createInvestmentHistoryRequestGate } from './investmentHistoryRequestGate';

describe('investment history request gate', () => {
  it('prevents stale filter and retry responses from replacing the current page', () => {
    const gate = createInvestmentHistoryRequestGate();
    const firstFilterRequest = gate.beginRefresh();
    const retryRequest = gate.beginRefresh();

    expect(gate.isCurrent(firstFilterRequest)).toBe(false);
    expect(gate.isCurrent(retryRequest)).toBe(true);
  });

  it('allows one load-more per revision and ignores stale request completion', () => {
    const gate = createInvestmentHistoryRequestGate();
    const first = gate.beginRefresh();
    const loadMore = gate.tryBeginLoadMore();

    expect(loadMore).toMatchObject({ requestRevision: first });
    expect(gate.tryBeginLoadMore()).toBeNull();

    const nextFilter = gate.beginRefresh();
    expect(gate.isCurrent(loadMore!.requestRevision)).toBe(false);
    const nextLoadMore = gate.tryBeginLoadMore();
    expect(nextLoadMore).toMatchObject({ requestRevision: nextFilter });
    gate.finishLoadMore(loadMore!);
    expect(gate.tryBeginLoadMore()).toBeNull();
    gate.finishLoadMore(nextLoadMore!);
    expect(gate.tryBeginLoadMore()).toMatchObject({ requestRevision: nextFilter });
  });
});
