import { withDatabaseAccess } from '../../../../core/storage/sqlite';
import {
  AddInvestmentAdjustmentInput,
  InvestmentAdjustmentRepository,
} from '../application/InvestmentAdjustmentRepository';
import {
  InvestmentAdjustment,
  InvestmentHistoryCursor,
  InvestmentHistoryItem,
  InvestmentHistoryPage,
  InvestmentHistoryPageRequest,
  InvestmentType,
} from '../domain/types';
import { buildInvestmentHistorySql } from './investmentHistoryQuery';

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

  async listHistoryPage(
    request: InvestmentHistoryPageRequest,
  ): Promise<InvestmentHistoryPage> {
    const query = buildInvestmentHistorySql(request);
    const rows = await withDatabaseAccess((db) => db.getAllAsync<{
      id: number;
      date: string;
      amount: number;
      note: string;
      type: string | null;
      supplier_name: string | null;
    }>(query.sql, query.parameters));

    const hasMore = rows.length > query.pageSize;
    const pageRows = hasMore ? rows.slice(0, query.pageSize) : rows;
    const items = pageRows.map((row): InvestmentHistoryItem => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      note: row.note,
      type: row.type === 'compra' ? 'compra' : 'ajuste',
      supplierName: row.supplier_name ?? null,
    }));
    const last = items[items.length - 1];
    const nextCursor: InvestmentHistoryCursor | null = hasMore && last
      ? { date: last.date, id: last.id }
      : null;

    return { items, hasMore, nextCursor };
  }

  async sumAmount(): Promise<number> {
    const row = await withDatabaseAccess((db) => db.getFirstAsync<{ total: number | null }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM investment_adjustments WHERE COALESCE(type, 'ajuste') = 'ajuste'`
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
