export interface MigratableDatabase {
  getFirstAsync<T>(source: string): Promise<T | null>;
  execAsync(source: string): Promise<void>;
}

type UserVersionRow = {
  user_version: number;
};

type Migration = {
  version: number;
  name: string;
  up: (db: MigratableDatabase) => Promise<void>;
};

export const CURRENT_SCHEMA_VERSION = 11;

const schemaMigrations: Migration[] = [
  {
    version: 1,
    name: 'create-daily-records-table',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS daily_records (
          date TEXT PRIMARY KEY NOT NULL,
          total_sold REAL NOT NULL,
          investment_cost REAL NOT NULL,
          additional_expenses REAL NOT NULL,
          notes TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(date);
      `);
    },
  },
  {
    version: 2,
    name: 'create-investment-adjustments-table',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS investment_adjustments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          amount REAL NOT NULL,
          note TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_investment_adjustments_date ON investment_adjustments(date);
      `);
    },
  },
  {
    version: 3,
    name: 'add-profit-percent-column',
    up: async (db) => {
      await db.execAsync(
        'ALTER TABLE daily_records ADD COLUMN profit_percent REAL NOT NULL DEFAULT 0.3;'
      );
      await db.execAsync(
        'ALTER TABLE daily_records ADD COLUMN net_profit REAL NOT NULL DEFAULT 0;'
      );
    },
  },
  {
    version: 4,
    name: 'repair-net-profit-column',
    up: async (db) => {
      const row = await db.getFirstAsync<{ hasColumn: number }>(
        `SELECT COUNT(*) AS hasColumn
         FROM pragma_table_info('daily_records')
         WHERE name = 'net_profit';`
      );
      if (!row || row.hasColumn === 0) {
        await db.execAsync(
          'ALTER TABLE daily_records ADD COLUMN net_profit REAL NOT NULL DEFAULT 0;'
        );
      }
    },
  },
  {
    version: 5,
    name: 'create-holidays-table',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS holidays (
          date TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'nacional'
        );
        CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 6,
    name: 'create-suppliers-table',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 7,
    name: 'add-dataphone-sales-to-daily-records',
    up: async (db) => {
      const row = await db.getFirstAsync<{ hasColumn: number }>(
        `SELECT COUNT(*) AS hasColumn
         FROM pragma_table_info('daily_records')
         WHERE name = 'dataphone_sales';`
      );
      if (!row || row.hasColumn === 0) {
        await db.execAsync(
          'ALTER TABLE daily_records ADD COLUMN dataphone_sales REAL NOT NULL DEFAULT 0;'
        );
      }
    },
  },
  {
    version: 8,
    name: 'add-supplier-id-and-type-to-investment-adjustments',
    up: async (db) => {
      const hasSupplierId = await db.getFirstAsync<{ hasColumn: number }>(
        `SELECT COUNT(*) AS hasColumn
         FROM pragma_table_info('investment_adjustments')
         WHERE name = 'supplier_id';`
      );
      if (!hasSupplierId || hasSupplierId.hasColumn === 0) {
        await db.execAsync(
          'ALTER TABLE investment_adjustments ADD COLUMN supplier_id INTEGER;'
        );
      }
      const hasType = await db.getFirstAsync<{ hasColumn: number }>(
        `SELECT COUNT(*) AS hasColumn
         FROM pragma_table_info('investment_adjustments')
         WHERE name = 'type';`
      );
      if (!hasType || hasType.hasColumn === 0) {
        await db.execAsync(
          "ALTER TABLE investment_adjustments ADD COLUMN type TEXT NOT NULL DEFAULT 'ajuste';"
        );
      }
    },
  },
  {
    version: 9,
    name: 'set-schema-identity',
    up: async (db) => {
      await db.execAsync(
        `INSERT INTO app_meta (key, value) VALUES ('schema_identity', 'appjorge')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      );
    },
  },
  {
    version: 10,
    name: 'create-store-catalog-sales-and-stock',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS store_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL COLLATE NOCASE UNIQUE,
          sort_order INTEGER NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
        );

        CREATE TABLE IF NOT EXISTS store_price_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL REFERENCES store_categories(id) ON DELETE RESTRICT,
          price_cents INTEGER NOT NULL CHECK (price_cents > 0),
          stock_units INTEGER NOT NULL DEFAULT 0 CHECK (stock_units >= 0),
          sort_order INTEGER NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
          UNIQUE (category_id, price_cents)
        );

        CREATE INDEX IF NOT EXISTS idx_store_price_groups_category
          ON store_price_groups(category_id, is_active, sort_order, price_cents);

        CREATE TABLE IF NOT EXISTS store_sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sold_at TEXT NOT NULL,
          total_cents INTEGER NOT NULL CHECK (total_cents >= 0)
        );

        CREATE INDEX IF NOT EXISTS idx_store_sales_sold_at
          ON store_sales(sold_at DESC);

        CREATE TABLE IF NOT EXISTS store_sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL REFERENCES store_sales(id) ON DELETE CASCADE,
          price_group_id INTEGER NOT NULL REFERENCES store_price_groups(id) ON DELETE RESTRICT,
          units_sold INTEGER NOT NULL CHECK (units_sold > 0),
          unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
          total_cents INTEGER NOT NULL CHECK (total_cents > 0)
        );

        CREATE TABLE IF NOT EXISTS store_stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          price_group_id INTEGER NOT NULL REFERENCES store_price_groups(id) ON DELETE RESTRICT,
          movement_type TEXT NOT NULL CHECK (movement_type IN ('venta', 'entrada', 'ajuste')),
          units_delta INTEGER NOT NULL CHECK (units_delta != 0),
          supplier_id INTEGER,
          sale_id INTEGER REFERENCES store_sales(id) ON DELETE SET NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_store_stock_movements_created_at
          ON store_stock_movements(created_at DESC, id DESC);

        INSERT OR IGNORE INTO store_categories (name, sort_order) VALUES
          ('Anillos', 0),
          ('Collares', 1),
          ('Pulseras', 2),
          ('Pendientes', 3);

        INSERT INTO app_meta (key, value) VALUES ('schema_identity', 'susu-boutique')
          ON CONFLICT(key) DO UPDATE SET value = excluded.value;
      `);
    },
  },
  {
    version: 11,
    name: 'add-store-price-group-example-photo',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE store_price_groups
        ADD COLUMN photo_data_url TEXT NOT NULL DEFAULT '';
      `);
    },
  },
];

async function getUserVersion(db: MigratableDatabase): Promise<number> {
  const row = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version;');
  return row?.user_version ?? 0;
}

async function runMigrationTransaction(db: MigratableDatabase, migration: Migration): Promise<void> {
  await db.execAsync('BEGIN IMMEDIATE;');

  try {
    await migration.up(db);
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw new Error(`Migration ${migration.version} (${migration.name}) failed`, {
      cause: error,
    });
  }
}

export async function runMigrationsThrough(
  db: MigratableDatabase,
  targetVersion = CURRENT_SCHEMA_VERSION,
): Promise<void> {
  const currentVersion = await getUserVersion(db);
  const pending = schemaMigrations
    .filter((migration) => migration.version > currentVersion && migration.version <= targetVersion)
    .sort((left, right) => left.version - right.version);

  for (const migration of pending) {
    await runMigrationTransaction(db, migration);
  }
}

export async function runMigrations(db: MigratableDatabase): Promise<void> {
  await runMigrationsThrough(db);
}
