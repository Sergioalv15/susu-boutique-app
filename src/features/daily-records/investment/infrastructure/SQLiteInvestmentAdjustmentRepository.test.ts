import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getTestDatabase, setTestDatabase } = vi.hoisted(() => {
  let testDatabase: any;
  return {
    getTestDatabase: () => testDatabase,
    setTestDatabase: (database: any) => { testDatabase = database; },
  };
});

vi.mock('../../../../core/storage/sqlite', () => ({
  withDatabaseAccess: (operation: (database: any) => Promise<unknown>) =>
    operation(getTestDatabase()),
}));

import { SQLiteInvestmentAdjustmentRepository } from './SQLiteInvestmentAdjustmentRepository';

describe('SQLiteInvestmentAdjustmentRepository.listHistoryPage', () => {
  let database: DatabaseSync;
  const repository = new SQLiteInvestmentAdjustmentRepository();

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    database.exec(`
      CREATE TABLE investment_adjustments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        type TEXT,
        supplier_id INTEGER
      );
      CREATE TABLE suppliers (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
      INSERT INTO suppliers (id, name) VALUES (1, 'Proveedor Uno');
    `);
    setTestDatabase({
      getAllAsync: async (sql: string, parameters: Array<string | number> = []) =>
        database.prepare(sql).all(...parameters),
      getFirstAsync: async (sql: string, parameters: Array<string | number> = []) =>
        database.prepare(sql).get(...parameters),
    });
  });

  afterEach(() => {
    database.close();
    setTestDatabase(null);
  });

  it('pages newest first with stable same-date id cursors and no duplicates', async () => {
    const insert = database.prepare(`
      INSERT INTO investment_adjustments (id, date, amount, note, type, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(1, '2026-09-15', 25, 'Aporte', 'ajuste', null);
    insert.run(2, '2026-09-15', 40, 'Compra sin proveedor', 'compra', null);
    insert.run(3, '2026-09-15', -5, 'Retiro anterior', 'ajuste', null);
    insert.run(4, '2026-08-31', 50, 'Compra', 'compra', 1);
    insert.run(5, '2026-07-11', -50, 'Retiro histórico', 'ajuste', null);

    const first = await repository.listHistoryPage({ limit: 2 });
    const second = await repository.listHistoryPage({ limit: 2, cursor: first.nextCursor });
    const third = await repository.listHistoryPage({ limit: 2, cursor: second.nextCursor });

    expect(first.items.map((item) => item.id)).toEqual([3, 2]);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toEqual({ date: '2026-09-15', id: 2 });
    expect(second.items.map((item) => item.id)).toEqual([1, 4]);
    expect(second.hasMore).toBe(true);
    expect(third.items.map((item) => item.id)).toEqual([5]);
    expect(third.hasMore).toBe(false);
    expect(third.nextCursor).toBeNull();
    expect(second.items[0].amount).toBe(25);
    expect(second.items[1]).toMatchObject({ type: 'compra', supplierName: 'Proveedor Uno' });
    expect(third.items[0]).toMatchObject({ type: 'ajuste', amount: -50 });
  });

  it('filters by stored movement type and month, including supplierless purchases and null legacy types', async () => {
    database.prepare(`
      INSERT INTO investment_adjustments (id, date, amount, note, type, supplier_id)
      VALUES (1, '2026-09-05', 75, 'Inversión sin proveedor', 'compra', NULL),
             (2, '2026-09-06', -20, 'Retiro antiguo', 'ajuste', NULL),
             (3, '2026-08-31', 30, 'Inversión de agosto', 'compra', 1),
             (4, '2026-09-07', 9, 'Tipo legado nulo', NULL, NULL)
    `).run();

    const purchases = await repository.listHistoryPage({
      limit: 25,
      type: 'compra',
      month: '2026-09',
    });
    const adjustments = await repository.listHistoryPage({
      limit: 25,
      type: 'ajuste',
      month: '2026-09',
    });

    expect(purchases.items).toEqual([
      expect.objectContaining({ id: 1, type: 'compra', amount: 75, supplierName: null }),
    ]);
    expect(adjustments.items).toEqual([
      expect.objectContaining({ id: 4, type: 'ajuste' }),
      expect.objectContaining({ id: 2, type: 'ajuste', amount: -20 }),
    ]);
  });

  it('keeps December month bounds from leaking into the next year', async () => {
    database.prepare(`
      INSERT INTO investment_adjustments (id, date, amount, note, type)
      VALUES (1, '2026-12-31', 10, 'Diciembre', 'ajuste'),
             (2, '2027-01-01', 20, 'Enero', 'ajuste')
    `).run();

    const december = await repository.listHistoryPage({ limit: 25, month: '2026-12' });

    expect(december.items.map((item) => item.date)).toEqual(['2026-12-31']);
  });

  it('includes signed NULL-type legacy rows in adjustment totals and excludes purchases', async () => {
    database.prepare(`
      INSERT INTO investment_adjustments (date, amount, note, type)
      VALUES ('2026-09-01', -35, 'Retiro legado', NULL),
             ('2026-09-02', 80, 'Ajuste manual', 'ajuste'),
             ('2026-09-03', 40, 'Compra', 'compra')
    `).run();

    await expect(repository.sumAmount()).resolves.toBe(45);
    await expect(repository.sumPurchases()).resolves.toBe(40);
  });
});
