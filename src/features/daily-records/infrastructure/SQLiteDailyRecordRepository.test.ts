import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { FIND_MOST_RECENT_DAILY_RECORD_ON_OR_BEFORE_QUERY } from './dailyRecordSql';

describe('findMostRecentOnOrBefore query', () => {
  it('selects the last recorded date across year boundaries and excludes future rows', () => {
    const database = new DatabaseSync(':memory:');
    try {
      database.exec(`
        CREATE TABLE daily_records (
          date TEXT PRIMARY KEY,
          total_sold REAL NOT NULL,
          additional_expenses REAL NOT NULL,
          profit_percent REAL NOT NULL,
          notes TEXT NOT NULL,
          dataphone_sales REAL NOT NULL
        )
      `);
      const insert = database.prepare(`
        INSERT INTO daily_records (date, total_sold, additional_expenses, profit_percent, notes, dataphone_sales)
        VALUES (?, 100, 10, 0.3, '', 20)
      `);
      insert.run('2025-12-31');
      insert.run('2026-01-02');
      insert.run('2026-02-01');

      const latest = database
        .prepare(FIND_MOST_RECENT_DAILY_RECORD_ON_OR_BEFORE_QUERY)
        .get('2026-01-01') as { date: string } | undefined;
      const empty = database
        .prepare(FIND_MOST_RECENT_DAILY_RECORD_ON_OR_BEFORE_QUERY)
        .get('2025-12-30');

      expect(latest?.date).toBe('2025-12-31');
      expect(empty).toBeUndefined();
    } finally {
      database.close();
    }
  });
});
