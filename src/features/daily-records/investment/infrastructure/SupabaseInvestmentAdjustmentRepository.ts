import { getSupabaseClient } from '../../../../core/backend/supabaseClient';
import { SUSU_BOUTIQUE_BUSINESS_ID } from '../../../../core/backend/config';
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

type AdjustmentRow = {
  id: number | string;
  date: string;
  amount: number | string;
  note: string;
  type: string | null;
  supplier_id: number | string | null;
};

type TotalsRow = {
  adjustments_total: number | string;
  purchases_total: number | string;
  invested_total: number | string;
};

function mapAdjustment(row: AdjustmentRow): InvestmentAdjustment {
  return {
    id: Number(row.id),
    date: row.date,
    amount: Number(row.amount),
    note: row.note,
    type: row.type === 'compra' ? 'compra' : 'ajuste',
    supplierId: row.supplier_id === null ? null : Number(row.supplier_id),
  };
}

function monthBounds(month: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new RangeError('Invalid investment history month');
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new RangeError('Invalid investment history month');
  const end = monthNumber === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
  return { start: `${month}-01`, end };
}

function pageSize(limit: number): number {
  const requested = Number.isFinite(limit) ? Math.floor(limit) : 25;
  return Math.min(100, Math.max(1, requested));
}

async function fetchTotals(): Promise<TotalsRow> {
  const { data, error } = await getSupabaseClient()
    .rpc('investment_balance_totals', { target_business_id: SUSU_BOUTIQUE_BUSINESS_ID });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    adjustments_total: Number(row?.adjustments_total ?? 0),
    purchases_total: Number(row?.purchases_total ?? 0),
    invested_total: Number(row?.invested_total ?? 0),
  };
}

export class SupabaseInvestmentAdjustmentRepository implements InvestmentAdjustmentRepository {
  async add(input: AddInvestmentAdjustmentInput): Promise<InvestmentAdjustment> {
    const { data, error } = await getSupabaseClient()
      .from('investment_adjustments')
      .insert({
        business_id: SUSU_BOUTIQUE_BUSINESS_ID,
        date: input.date,
        amount: input.amount,
        note: input.note,
        type: input.type ?? 'ajuste',
        supplier_id: input.supplierId ?? null,
      })
      .select('id,date,amount,note,type,supplier_id')
      .single();

    if (error) throw error;
    return mapAdjustment(data as AdjustmentRow);
  }

  async listAll(types?: InvestmentType[]): Promise<InvestmentAdjustment[]> {
    const results: InvestmentAdjustment[] = [];
    const batchSize = 500;
    for (let offset = 0; ; offset += batchSize) {
      let query = getSupabaseClient()
        .from('investment_adjustments')
        .select('id,date,amount,note,type,supplier_id')
        .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
        .order('date', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (types?.length) query = query.in('type', types);
      const { data, error } = await query;
      if (error) throw error;
      const batch = (data ?? []).map((row) => mapAdjustment(row as AdjustmentRow));
      results.push(...batch);
      if (batch.length < batchSize) return results;
    }
  }

  async listHistoryPage(request: InvestmentHistoryPageRequest): Promise<InvestmentHistoryPage> {
    const size = pageSize(request.limit);
    let query = getSupabaseClient()
      .from('investment_adjustments')
      .select('id,date,amount,note,type,supplier_id')
      .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(size + 1);

    if (request.type) query = query.eq('type', request.type);
    if (request.month) {
      const { start, end } = monthBounds(request.month);
      query = query.gte('date', start).lt('date', end);
    }
    if (request.cursor) {
      const { date, id } = request.cursor;
      query = query.or(`date.lt.${date},and(date.eq.${date},id.lt.${id})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as AdjustmentRow[];
    const hasMore = rows.length > size;
    const pageRows = hasMore ? rows.slice(0, size) : rows;
    const supplierIds = [...new Set(pageRows
      .map((row) => row.supplier_id)
      .filter((id): id is number | string => id !== null)
      .map(Number))];
    const supplierNames = new Map<number, string>();

    if (supplierIds.length > 0) {
      const { data: suppliers, error: suppliersError } = await getSupabaseClient()
        .from('suppliers')
        .select('id,name')
        .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
        .in('id', supplierIds);
      if (suppliersError) throw suppliersError;
      for (const supplier of suppliers ?? []) {
        supplierNames.set(Number(supplier.id), supplier.name);
      }
    }

    const items: InvestmentHistoryItem[] = pageRows.map((row) => ({
      id: Number(row.id),
      date: row.date,
      amount: Number(row.amount),
      note: row.note,
      type: row.type === 'compra' ? 'compra' : 'ajuste',
      supplierName: row.supplier_id === null ? null : supplierNames.get(Number(row.supplier_id)) ?? null,
    }));
    const last = items[items.length - 1];
    const nextCursor: InvestmentHistoryCursor | null = hasMore && last
      ? { date: last.date, id: last.id }
      : null;

    return { items, hasMore, nextCursor };
  }

  async sumAmount(): Promise<number> {
    const totals = await fetchTotals();
    return Number(totals.adjustments_total);
  }

  async sumPurchases(): Promise<number> {
    const totals = await fetchTotals();
    return Number(totals.purchases_total);
  }
}
