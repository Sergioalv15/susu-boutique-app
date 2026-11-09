import { withDatabaseAccess } from '../../../core/storage/sqlite';
import { DailyRecordRepository } from '../application/DailyRecordRepository';
import { DailyRecord } from '../domain/types';
import { FIND_MOST_RECENT_DAILY_RECORD_ON_OR_BEFORE_QUERY } from './dailyRecordSql';

type DailyRecordRow = {
  date: string;
  total_sold: number;
  additional_expenses: number;
  profit_percent: number;
  notes: string;
  dataphone_sales: number;
};

function mapRow(row: DailyRecordRow): DailyRecord {
  return {
    date: row.date,
    totalSold: row.total_sold,
    additionalExpenses: row.additional_expenses,
    profitPercent: row.profit_percent,
    notes: row.notes,
    dataphoneSales: row.dataphone_sales,
  };
}

export class SQLiteDailyRecordRepository implements DailyRecordRepository {
  async upsert(record: DailyRecord): Promise<void> {
    await withDatabaseAccess(async (db) => {
      const investment = Math.round(record.totalSold * (1 - record.profitPercent) * 100) / 100;

      await db.runAsync(
        `
      INSERT INTO daily_records (date, total_sold, investment_cost, additional_expenses, profit_percent, net_profit, notes, dataphone_sales)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_sold = excluded.total_sold,
        investment_cost = excluded.investment_cost,
        additional_expenses = excluded.additional_expenses,
        profit_percent = excluded.profit_percent,
        notes = excluded.notes,
        dataphone_sales = excluded.dataphone_sales
      `,
        [
          record.date,
          record.totalSold,
          investment,
          record.additionalExpenses,
          record.profitPercent,
          0,
          record.notes,
          record.dataphoneSales ?? 0,
        ]
      );
    });
  }

  async findByDate(date: string): Promise<DailyRecord | null> {
    const row = await withDatabaseAccess((db) =>
      db.getFirstAsync<DailyRecordRow>(
        `SELECT date, total_sold, additional_expenses, profit_percent, notes, dataphone_sales FROM daily_records WHERE date = ?`,
        [date]
      )
    );

    return row ? mapRow(row) : null;
  }

  async findMostRecentOnOrBefore(date: string): Promise<DailyRecord | null> {
    const row = await withDatabaseAccess((db) =>
      db.getFirstAsync<DailyRecordRow>(
        FIND_MOST_RECENT_DAILY_RECORD_ON_OR_BEFORE_QUERY,
        [date]
      )
    );

    return row ? mapRow(row) : null;
  }

  async findByMonth(month: string): Promise<DailyRecord[]> {
    const rows = await withDatabaseAccess((db) =>
      db.getAllAsync<DailyRecordRow>(
        `
      SELECT date, total_sold, additional_expenses, profit_percent, notes, dataphone_sales
      FROM daily_records
      WHERE substr(date, 1, 7) = ?
      ORDER BY date ASC
      `,
        [month]
      )
    );

    return rows.map(mapRow);
  }

  async sumInvestmentCost(): Promise<number> {
    const rows = await withDatabaseAccess((db) =>
      db.getAllAsync<{ total_sold: number; profit_percent: number }>(
        `SELECT total_sold, profit_percent FROM daily_records`
      )
    );

    return rows.reduce((sum, row) => sum + row.total_sold * (1 - row.profit_percent), 0);
  }
}
