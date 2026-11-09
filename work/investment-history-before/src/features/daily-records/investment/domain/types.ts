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
  supplierName: string | null;
}