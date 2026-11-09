import { DailyRecordRepository } from '../../application/DailyRecordRepository';
import {
  InvestmentAdjustment,
  InvestmentBalance,
  InvestmentHistoryPage,
  InvestmentHistoryPageRequest,
} from '../domain/types';
import { InvestmentAdjustmentRepository } from './InvestmentAdjustmentRepository';

export interface AddPurchaseInput {
  date: string;
  amount: number;
  note: string;
  supplierId?: number | null;
}

export class InvestmentBalanceService {
  constructor(
    private readonly adjustmentRepository: InvestmentAdjustmentRepository,
    private readonly dailyRecordRepository: DailyRecordRepository
  ) {}

  async getBalance(): Promise<InvestmentBalance> {
    const [adjustmentsTotal, purchasesTotal, investedTotal] = await Promise.all([
      this.adjustmentRepository.sumAmount(),
      this.adjustmentRepository.sumPurchases(),
      this.dailyRecordRepository.sumInvestmentCost(),
    ]);

    return {
      available: adjustmentsTotal + investedTotal - purchasesTotal,
      adjustmentsTotal,
      investedTotal,
      purchasesTotal,
    };
  }

  async addAdjustment(input: {
    date: string;
    amount: number;
    note: string;
  }): Promise<InvestmentAdjustment> {
    return this.adjustmentRepository.add({ ...input, type: 'ajuste' });
  }

  async addPurchase(input: AddPurchaseInput): Promise<InvestmentAdjustment> {
    return this.adjustmentRepository.add({
      date: input.date,
      amount: Math.abs(input.amount),
      note: input.note,
      type: 'compra',
      supplierId: input.supplierId ?? null,
    });
  }

  async listAdjustments(): Promise<InvestmentAdjustment[]> {
    return this.adjustmentRepository.listAll();
  }

  async listPurchases(): Promise<InvestmentAdjustment[]> {
    return this.adjustmentRepository.listAll(['compra']);
  }

  async listHistoryPage(
    request: InvestmentHistoryPageRequest,
  ): Promise<InvestmentHistoryPage> {
    return this.adjustmentRepository.listHistoryPage(request);
  }
}
