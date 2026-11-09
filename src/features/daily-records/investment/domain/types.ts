export type InvestmentType = 'ajuste' | 'compra';

export interface InvestmentAdjustment {
  id: number;
  date: string;
  amount: number;
  note: string;
  type: InvestmentType;
  supplierId: number | null;
}

export interface InvestmentBalance {
  available: number;
  adjustmentsTotal: number;
  investedTotal: number;
  purchasesTotal: number;
}

export interface InvestmentHistoryItem {
  id: number;
  date: string;
  amount: number;
  note: string;
  type: InvestmentType;
  supplierName: string | null;
}

export interface InvestmentHistoryCursor {
  date: string;
  id: number;
}

export interface InvestmentHistoryPageRequest {
  limit: number;
  cursor?: InvestmentHistoryCursor | null;
  type?: InvestmentType | null;
  month?: string | null;
}

export interface InvestmentHistoryPage {
  items: InvestmentHistoryItem[];
  hasMore: boolean;
  nextCursor: InvestmentHistoryCursor | null;
}
