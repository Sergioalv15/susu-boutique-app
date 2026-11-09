import { getSupabaseClient } from '../../../core/backend/supabaseClient';
import { SUSU_BOUTIQUE_BUSINESS_ID } from '../../../core/backend/config';
import { DailyRecordRepository } from '../application/DailyRecordRepository';
import { DailyRecord } from '../domain/types';

type DailyRecordRow = {
  date: string;
  total_sold: number | string;
  additional_expenses: number | string;
  profit_percent: number | string;
  notes: string;
  dataphone_sales: number | string;
};

function mapRow(row: DailyRecordRow): DailyRecord {
  return {
    date: row.date,
    totalSold: Number(row.total_sold),
    additionalExpenses: Number(row.additional_expenses),
    profitPercent: Number(row.profit_percent),
    notes: row.notes,
    dataphoneSales: Number(row.dataphone_sales),
  };
}

function monthBounds(month: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new RangeError('Invalid month');
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new RangeError('Invalid month');
  const nextMonth = monthNumber === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
  return { start: `${month}-01`, end: nextMonth };
}

export class SupabaseDailyRecordRepository implements DailyRecordRepository {
  async upsert(record: DailyRecord): Promise<void> {
    const investmentCost = Math.round(record.totalSold * (1 - record.profitPercent) * 100) / 100;
    const { error } = await getSupabaseClient().from('daily_records').upsert({
      business_id: SUSU_BOUTIQUE_BUSINESS_ID,
      date: record.date,
      total_sold: record.totalSold,
      investment_cost: investmentCost,
      additional_expenses: record.additionalExpenses,
      profit_percent: record.profitPercent,
      net_profit: record.totalSold - investmentCost - record.additionalExpenses,
      notes: record.notes,
      dataphone_sales: record.dataphoneSales ?? 0,
    }, { onConflict: 'business_id,date' });

    if (error) throw error;
  }

  async findByDate(date: string): Promise<DailyRecord | null> {
    const { data, error } = await getSupabaseClient()
      .from('daily_records')
      .select('date,total_sold,additional_expenses,profit_percent,notes,dataphone_sales')
      .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
      .eq('date', date)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRow(data as DailyRecordRow) : null;
  }

  async findMostRecentOnOrBefore(date: string): Promise<DailyRecord | null> {
    const { data, error } = await getSupabaseClient()
      .from('daily_records')
      .select('date,total_sold,additional_expenses,profit_percent,notes,dataphone_sales')
      .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
      .lte('date', date)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRow(data as DailyRecordRow) : null;
  }

  async findByMonth(month: string): Promise<DailyRecord[]> {
    const { start, end } = monthBounds(month);
    const { data, error } = await getSupabaseClient()
      .from('daily_records')
      .select('date,total_sold,additional_expenses,profit_percent,notes,dataphone_sales')
      .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => mapRow(row as DailyRecordRow));
  }

  async sumInvestmentCost(): Promise<number> {
    const { data, error } = await getSupabaseClient()
      .rpc('investment_balance_totals', { target_business_id: SUSU_BOUTIQUE_BUSINESS_ID });

    if (error) throw error;
    const totals = Array.isArray(data) ? data[0] : data;
    return Number(totals?.invested_total ?? 0);
  }
}
