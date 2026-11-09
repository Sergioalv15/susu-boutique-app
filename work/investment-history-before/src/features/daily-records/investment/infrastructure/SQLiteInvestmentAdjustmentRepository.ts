import { withDatabaseAccess } from '../../../../core/storage/sqlite';
import {
  AddInvestmentAdjustmentInput,
  InvestmentAdjustmentRepository,
} from '../application/InvestmentAdjustmentRepository';
import { InvestmentAdjustment, InvestmentHistoryItem, InvestmentType } from '../domain/types';

type InvestmentAdjustmentRow = {
  id: number;
  date: string;
  amount: number;
  note: string;
  type: string;
  supplier_id: number | null;
};

function mapRow(row: InvestmentAdjustmentRow): InvestmentAdjustment {
  return {
    id: row.id,
    date: row.date,
    amount: row.amount,
    note: row.note,
    type: row.type === 'compra' ? 'compra' : 'ajuste',
    supplierId: row.supplier_id ?? null,
  };
}

export class SQLiteInvestmentAdjustmentRepository implements InvestmentAdjustmentRepository {
  async add(input: AddInvestmentAdjustmentInput): Promise<InvestmentAdjustment> {
    const type: InvestmentType = input.type ?? 'ajuste';
    const supplierId = input.supplierId ?? null;

    const result = await withDatabaseAccess((db) => db.runAsync(
      `INSERT INTO investment_adjustments (date, amount, note, type, supplier_id) VALUES (?, ?, ?, ?, ?)`,
      [input.date, input.amount, input.note, type, supplierId]
    ));

    return {
      id: result.lastInsertRowId,
      date: input.date,
      amount: input.amount,
      note: input.note,
      type,
      supplierId,
    };
  }

  async listAll(types?: InvestmentType[]): Promise<InvestmentAdjustment[]> {
    const rows = await withDatabaseAccess((db) =>
      types && types.length > 0
        ? db.getAllAsync<InvestmentAdjustmentRow>(
            `SELECT id, date, amount, note, type, supplier_id FROM investment_adjustments
             WHERE type IN (${types.map(() => '?').join(', ')})
             ORDER BY date ASC, id ASC`,
            types
          )
        : db.getAllAsync<InvestmentAdjustmentRow>(
            `SELECT id, date, amount, note, type, supplier_id FROM investment_adjustments ORDER BY date ASC, id ASC`
          )
    );

    return rows.map(mapRow);
  }

  async listHistory(): Promise<InvestmentHistoryItem[]> {
    const rows = await withDatabaseAccess((db) => db.getAllAsync<{
      id: number;
      date: string;
      amount: number;
      note: string;
      supplier_name: string | null;
    }>(
      `SELECT a.id, a.date, a.amount, a.note, s.name AS supplier_name
       FROM investment_adjustments a
       LEFT JOIN suppliers s ON s.id = a.supplier_id
       ORDER BY a.date DESC, a.id DESC
       LIMIT 100`
    ));

    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      note: row.note,
      supplierName: row.supplier_name ?? null,
    }));
  }

  async sumAmount(): Promise<number> {
    const row = await withDatabaseAccess((db) => db.getFirstAsync<{ total: number | null }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM investment_adjustments WHERE type = 'ajuste'`
    ));

    return row?.total ?? 0;
  }

  async sumPurchases(): Promise<number> {
    const row = await withDatabaseAccess((db) => db.getFirstAsync<{ total: number | null }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM investment_adjustments WHERE type = 'compra'`
    ));

    return row?.total ?? 0;
  }
}
