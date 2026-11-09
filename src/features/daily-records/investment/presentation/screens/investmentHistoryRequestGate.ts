export interface HistoryLoadMoreToken {
  requestRevision: number;
  sequence: number;
}

export function createInvestmentHistoryRequestGate() {
  let revision = 0;
  let sequence = 0;
  let inFlightLoadMore: HistoryLoadMoreToken | null = null;

  return {
    beginRefresh(): number {
      revision += 1;
      return revision;
    },
    invalidate(): void {
      revision += 1;
    },
    isCurrent(requestRevision: number): boolean {
      return requestRevision === revision;
    },
    tryBeginLoadMore(): HistoryLoadMoreToken | null {
      if (inFlightLoadMore?.requestRevision === revision) return null;
      sequence += 1;
      inFlightLoadMore = { requestRevision: revision, sequence };
      return inFlightLoadMore;
    },
    finishLoadMore(token: HistoryLoadMoreToken): void {
      if (inFlightLoadMore?.sequence === token.sequence) inFlightLoadMore = null;
    },
  };
}
