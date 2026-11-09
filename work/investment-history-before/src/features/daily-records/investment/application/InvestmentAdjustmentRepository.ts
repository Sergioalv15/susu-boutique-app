import { InvestmentAdjustment, InvestmentHistoryItem, InvestmentType } from '../domain/types';

export interface AddInvestmentAdjustmentInput {
  date: string;
  amount: number;
  note: string;
  type?: InvestmentType;
  supplierId?: number | null;
}

export interface InvestmentAdjustmentRepository {
  add(input: AddInvestmentAdjustmentInput): Promise<InvestmentAdjustment>;
  listAll(types?: InvestmentType[]): Promise<InvestmentAdjustment[]>;
  listHistory(): Promise<InvestmentHistoryItem[]>;
  sumAmount(): Promise<number>;
  sumPurchases(): Promise<number>;
}