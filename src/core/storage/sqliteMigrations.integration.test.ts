import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigrations } from './sqliteMigrations';

describe('store schema migration', () => {
  let database: DatabaseSync | null = null;

  afterEach(() => {
    database?.close();
    database = null;
  });

  it('creates the local catalog and seeds the four store categories', async () => {
    database = new DatabaseSync(':memory:');
    const db = database;

    await runMigrations({
      getFirstAsync: async <T>(sql: string) => db.prepare(sql).get() as T | undefined ?? null,
      execAsync: async (sql: string) => db.exec(sql),
    });

    const categories = database.prepare(
      'SELECT name FROM store_categories ORDER BY sort_order ASC',
    ).all() as Array<{ name: string }>;
    const userVersion = database.prepare('PRAGMA user_version;').get() as { user_version: number };

    expect(categories.map((category) => category.name)).toEqual([
      'Anillos',
      'Collares',
      'Pulseras',
      'Pendientes',
    ]);
    expect(userVersion.user_version).toBe(11);
    const photoColumn = database.prepare('PRAGMA table_info(store_price_groups);').all()
      .find((column) => (column as { name: string }).name === 'photo_data_url');
    expect(photoColumn).toBeDefined();
  });
});
