import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const ownerId = '11111111-1111-4111-8111-111111111111';
const staffId = '22222222-2222-4222-8222-222222222222';
const businessId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const outsiderId = '55555555-5555-4555-8555-555555555555';
const migrations = [
  '20261111220000_private_app_schema.sql',
  '20261111223000_store_operations.sql',
  '20261113210000_staff_can_only_sell.sql',
  '20261114120000_staff_sale_financial_boundary.sql',
  '20261115090000_daily_investment_supabase.sql',
  '20261115100000_owner_manage_business_members.sql',
  '20261115110000_list_store_stock_subgroups.sql',
  '20261115120000_sale_cost_subgroups.sql',
  '20261115130000_owner_stock_catalog_crud.sql',
];

type JsonRecord = Record<string, unknown>;

function columnValue(row: unknown, column: string): unknown {
  return (row as Record<string, unknown> | undefined)?.[column];
}

async function asUser<T>(db: PGlite, userId: string, action: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec('set role authenticated');
  try {
    return await action();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function createHarness(): Promise<{ db: PGlite; priceGroupId: number }> {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text unique);
    create function auth.uid() returns uuid
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (bucket_id text not null, name text not null);
    create function storage.foldername(text) returns text[]
    language sql immutable
    as $$ select string_to_array($1, '/') $$;
  `);
  for (const migration of migrations) {
    const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations', migration), 'utf8');
    await db.exec(sql);
  }

  await db.query(
    'insert into auth.users (id, email) values ($1::uuid, $4), ($2::uuid, $5), ($3::uuid, $6)',
    [ownerId, staffId, outsiderId, 'owner@example.test', 'staff@example.test', 'outsider@example.test'],
  );
  await db.query(
    'insert into public.businesses (id, slug, name) values ($1::uuid, $2, $3)',
    [businessId, 'catalog-test', 'Catalog test business'],
  );
  await db.query(
    'insert into public.business_members (business_id, user_id, role) values ($1::uuid, $2::uuid, $3), ($1::uuid, $4::uuid, $5)',
    [businessId, ownerId, 'owner', staffId, 'staff'],
  );
  const category = await asUser(db, ownerId, async () => {
    const { rows } = await db.query('select public.create_store_category($1::text) as result', ['Test category']);
    return columnValue(rows[0], 'result') as JsonRecord;
  });
  const categoryId = Number(category.id);
  const group = await asUser(db, ownerId, async () => {
    const { rows } = await db.query(
      'select public.create_store_price_group($1::bigint, $2::bigint, $3::text) as result',
      [categoryId, 1000, ''],
    );
    return columnValue(rows[0], 'result') as JsonRecord;
  });
  const priceGroupId = Number(group.id);
  await asUser(db, ownerId, async () => db.query(
    'select public.add_store_stock($1::bigint, $2::bigint, $3::integer, $4::bigint, $5::text)',
    [categoryId, 1000, 2, 400, null],
  ));
  return { db, priceGroupId };
}

async function callSale(db: PGlite, priceGroupId: number): Promise<void> {
  await asUser(db, ownerId, async () => db.query(
    'select public.complete_store_sale($1::jsonb, $2::text)',
    [JSON.stringify([{ priceGroupId, units: 1 }]), 'catalog-history-sale'],
  ));
}

describe('Supabase stock catalog RPC role boundaries', () => {
  let db: PGlite;
  let priceGroupId: number;

  beforeEach(async () => {
    ({ db, priceGroupId } = await createHarness());
  });

  afterEach(async () => {
    await db.close();
  });

  it('allows owners to rename categories and denies staff without changing them', async () => {
    const categoryId = Number((await db.query<{ category_id: number }>(
      'select category_id::integer as category_id from public.store_price_groups where id = $1::bigint',
      [priceGroupId],
    )).rows[0].category_id);
    const { rows } = await asUser(db, ownerId, async () => db.query(
      'select public.update_store_category($1::bigint, $2::text) as result',
      [categoryId, 'Anillos corregidos'],
    ));
    expect(columnValue(rows[0], 'result')).toMatchObject({ id: categoryId, name: 'Anillos corregidos' });

    await expect(asUser(db, staffId, () => db.query(
      'select public.update_store_category($1::bigint, $2::text)', [categoryId, 'Sin permiso'],
    ))).rejects.toMatchObject({ code: '42501' });
    expect((await db.query('select name from public.store_categories where id = $1::bigint', [categoryId])).rows[0])
      .toMatchObject({ name: 'Anillos corregidos' });
    await expect(asUser(db, outsiderId, () => db.query(
      'select public.update_store_category($1::bigint, $2::text)', [categoryId, 'Sin acceso'],
    ))).rejects.toMatchObject({ code: '42501' });
  });

  it('grants stock catalog RPCs only to authenticated callers', async () => {
    const { rows } = await db.query(
      `select
        has_function_privilege('anon', 'public.update_store_category(bigint,text)', 'execute') as anon_category,
        has_function_privilege('authenticated', 'public.update_store_category(bigint,text)', 'execute') as auth_category,
        has_function_privilege('anon', 'public.update_store_price_group(bigint,bigint,integer,text)', 'execute') as anon_group,
        has_function_privilege('authenticated', 'public.update_store_price_group(bigint,bigint,integer,text)', 'execute') as auth_group,
        has_function_privilege('anon', 'public.delete_store_price_group(bigint)', 'execute') as anon_delete_group,
        has_function_privilege('authenticated', 'public.delete_store_price_group(bigint)', 'execute') as auth_delete_group,
        has_function_privilege('anon', 'public.delete_store_category(bigint)', 'execute') as anon_delete_category,
        has_function_privilege('authenticated', 'public.delete_store_category(bigint)', 'execute') as auth_delete_category`,
    );
    expect(rows[0]).toEqual({
      anon_category: false,
      auth_category: true,
      anon_group: false,
      auth_group: true,
      anon_delete_group: false,
      auth_delete_group: true,
      anon_delete_category: false,
      auth_delete_category: true,
    });
  });

  it('versions a referenced price group and transfers remaining cost subgroups without rewriting sales', async () => {
    await callSale(db, priceGroupId);
    const categoryId = Number((await db.query<{ category_id: number }>(
      'select category_id::integer as category_id from public.store_price_groups where id = $1::bigint',
      [priceGroupId],
    )).rows[0].category_id);
    await asUser(db, ownerId, async () => db.query(
      'select public.add_store_stock($1::bigint, $2::bigint, $3::integer, $4::bigint, $5::text)',
      [categoryId, 1000, 2, 150, null],
    ));

    const { rows } = await asUser(db, ownerId, async () => db.query(
      'select public.update_store_price_group($1::bigint, $2::bigint, $3::integer, $4::text) as result',
      [priceGroupId, 1200, 0, null],
    ));
    const result = columnValue(rows[0], 'result') as JsonRecord;
    expect(result).toMatchObject({ previousGroupId: priceGroupId, priceCents: 1200, stockUnits: 3, status: 'versioned' });
    const newPriceGroupId = Number(result.id);
    expect(newPriceGroupId).not.toBe(priceGroupId);

    expect((await db.query('select is_active, stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ is_active: false, stock_units: 0 });
    expect((await db.query('select is_active, price_cents, stock_units from public.store_price_groups where id = $1::bigint', [newPriceGroupId])).rows[0])
      .toMatchObject({ is_active: true, price_cents: 1200, stock_units: 3 });
    expect((await db.query('select price_group_id, base_unit_price_cents, cost_total_cents from public.store_sale_items where sale_id = 1')).rows[0])
      .toMatchObject({ price_group_id: priceGroupId, base_unit_price_cents: 1000, cost_total_cents: 400 });
    expect((await db.query(
      'select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots where price_group_id = $1::bigint order by id',
      [newPriceGroupId],
    )).rows).toEqual([
      { unit_cost_cents: 400, remaining_units: 1 },
      { unit_cost_cents: 150, remaining_units: 2 },
    ]);
  });

  it('deletes a stock-bearing group by recording adjustment-out and archiving it', async () => {
    const { rows } = await asUser(db, ownerId, async () => db.query(
      'select public.delete_store_price_group($1::bigint) as result', [priceGroupId],
    ));
    expect(columnValue(rows[0], 'result')).toMatchObject({ id: priceGroupId, status: 'archived', adjustedUnits: 2 });
    expect((await db.query('select is_active, stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ is_active: false, stock_units: 0 });
    expect((await db.query("select units_delta, cost_total_cents from public.store_stock_movements where movement_type = 'ajuste'")).rows)
      .toEqual([{ units_delta: -2, cost_total_cents: 800 }]);
    expect((await db.query('select remaining_units from public.store_stock_lots where price_group_id = $1::bigint', [priceGroupId])).rows)
      .toEqual([{ remaining_units: 0 }]);
  });

  it('deletes an unused price group but archives a category that has historical groups', async () => {
    const categoryId = Number((await db.query<{ category_id: number }>(
      'select category_id::integer as category_id from public.store_price_groups where id = $1::bigint',
      [priceGroupId],
    )).rows[0].category_id);
    const unusedGroup = await asUser(db, ownerId, async () => {
      const { rows } = await db.query(
        'select public.create_store_price_group($1::bigint, $2::bigint, $3::text) as result',
        [categoryId, 1500, ''],
      );
      return columnValue(rows[0], 'result') as JsonRecord;
    });
    const unusedGroupId = Number(unusedGroup.id);
    await expect(asUser(db, ownerId, async () => {
      const { rows } = await db.query('select public.delete_store_price_group($1::bigint) as result', [unusedGroupId]);
      return columnValue(rows[0], 'result');
    })).resolves.toMatchObject({ status: 'deleted' });
    expect((await db.query('select count(*)::integer as count from public.store_price_groups where id = $1::bigint', [unusedGroupId])).rows[0])
      .toMatchObject({ count: 0 });

    const { rows } = await asUser(db, ownerId, async () => db.query(
      'select public.delete_store_category($1::bigint) as result', [categoryId],
    ));
    expect(columnValue(rows[0], 'result')).toMatchObject({ status: 'archived', adjustedUnits: 2 });
    expect((await db.query('select is_active from public.store_categories where id = $1::bigint', [categoryId])).rows[0])
      .toMatchObject({ is_active: false });
    expect((await db.query('select is_active, stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ is_active: false, stock_units: 0 });
  });

  it('archives a category and retires its remaining groups with adjustment movements', async () => {
    const categoryId = Number((await db.query<{ category_id: number }>(
      'select category_id::integer as category_id from public.store_price_groups where id = $1::bigint',
      [priceGroupId],
    )).rows[0].category_id);
    const { rows } = await asUser(db, ownerId, async () => db.query(
      'select public.delete_store_category($1::bigint) as result', [categoryId],
    ));
    expect(columnValue(rows[0], 'result')).toMatchObject({ status: 'archived', adjustedUnits: 2 });
    expect((await db.query('select is_active from public.store_categories where id = $1::bigint', [categoryId])).rows[0])
      .toMatchObject({ is_active: false });
    expect((await db.query('select is_active, stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ is_active: false, stock_units: 0 });
    expect((await db.query("select units_delta, cost_total_cents from public.store_stock_movements where movement_type = 'ajuste'")).rows)
      .toEqual([{ units_delta: -2, cost_total_cents: 800 }]);
  });
});
