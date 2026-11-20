import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const ownerId = '11111111-1111-4111-8111-111111111111';
const staffId = '22222222-2222-4222-8222-222222222222';
const businessId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const newStaffId = '33333333-3333-4333-8333-333333333333';
const newOwnerId = '44444444-4444-4444-8444-444444444444';
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
  '20261115140000_stock_subgroup_adjustments.sql',
  '20261120100000_sale_undo.sql',
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

async function callSaleItems(db: PGlite, userId: string, requestId: string, items: JsonRecord[]): Promise<JsonRecord> {
  return asUser(db, userId, async () => {
    const { rows } = await db.query(
      'select public.complete_store_sale($1::jsonb, $2::text) as receipt',
      [JSON.stringify(items), requestId],
    );
    return columnValue(rows[0], 'receipt') as JsonRecord;
  });
}

async function callSale(db: PGlite, userId: string, requestId: string, priceGroupId: number): Promise<JsonRecord> {
  return callSaleItems(db, userId, requestId, [{ priceGroupId, units: 1 }]);
}

async function callUndo(db: PGlite, userId: string, saleId: number): Promise<JsonRecord> {
  return asUser(db, userId, async () => {
    const { rows } = await db.query('select public.undo_store_sale($1::bigint) as result', [saleId]);
    return columnValue(rows[0], 'result') as JsonRecord;
  });
}

async function callTodaySummary(db: PGlite, userId: string): Promise<JsonRecord> {
  return asUser(db, userId, async () => {
    const { rows } = await db.query(
      'select public.get_store_today_summary($1::timestamptz, $2::timestamptz) as summary',
      ['2000-01-01T00:00:00Z', '2100-01-01T00:00:00Z'],
    );
    return columnValue(rows[0], 'summary') as JsonRecord;
  });
}

async function activateMember(db: PGlite, actorId: string, email: string, role: string): Promise<void> {
  await asUser(db, actorId, async () => {
    await db.query('select public.add_business_member_by_email($1::text, $2::text)', [email, role]);
  });
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
    'insert into auth.users (id, email) values ($1::uuid, $3), ($2::uuid, $4), ($5::uuid, $6), ($7::uuid, $8), ($9::uuid, $10)',
    [ownerId, staffId, 'owner@example.test', 'staff@example.test', newStaffId, 'new-staff@example.test', newOwnerId, 'new-owner@example.test', outsiderId, 'outsider@example.test'],
  );
  await db.query(
    'insert into public.businesses (id, slug, name) values ($1::uuid, $2, $3)',
    [businessId, 'rpc-test', 'RPC test business'],
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

describe('Supabase store RPC role boundaries', () => {
  let db: PGlite;
  let priceGroupId: number;

  beforeEach(async () => {
    ({ db, priceGroupId } = await createHarness());
  });

  afterEach(async () => {
    await db.close();
  });

  it('keeps financial summaries for owners and denies them to staff', async () => {
    await callSale(db, ownerId, 'owner-summary-sale', priceGroupId);
    const before = await callTodaySummary(db, ownerId);
    expect(before).toMatchObject({ totalCents: 1000, unitsSold: 1, costTotalCents: 400, profitCents: 600 });

    await expect(callTodaySummary(db, staffId)).rejects.toMatchObject({ code: '42501' });
    await expect(callTodaySummary(db, ownerId)).resolves.toEqual(before);
  });

  it('keeps staff sale receipts useful but omits financial costs/profit on create and retry', async () => {
    const requestId = 'staff-sale-0001';
    const receipt = await callSale(db, staffId, requestId, priceGroupId);

    expect(receipt).toMatchObject({ unitsSold: 1, totalCents: 1000 });
    expect(receipt).not.toHaveProperty('costTotalCents');
    expect(receipt).not.toHaveProperty('profitCents');
    expect(receipt.items).toEqual([
      expect.objectContaining({ units: 1, totalCents: 1000 }),
    ]);
    expect((receipt.items as JsonRecord[])[0]).not.toHaveProperty('costTotalCents');

    const retry = await callSale(db, staffId, requestId, priceGroupId);
    expect(retry).toEqual(receipt);
    expect(retry).not.toHaveProperty('costTotalCents');
    expect((retry.items as JsonRecord[])[0]).not.toHaveProperty('costTotalCents');

    const ownerRetry = await callSale(db, ownerId, requestId, priceGroupId);
    expect(ownerRetry).toMatchObject({ costTotalCents: 400, profitCents: 600 });
    expect((ownerRetry.items as JsonRecord[])[0]).toHaveProperty('costTotalCents', 400);
  });

  it('consumes the selected subgroup for staff without disclosing its cost, including on owner retry', async () => {
    await db.query(
      `insert into public.store_stock_lots (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
       values ($1::uuid, $2::bigint, 2, 2, 150), ($1::uuid, $2::bigint, 2, 2, 150)`,
      [businessId, priceGroupId],
    );
    await db.query('update public.store_price_groups set stock_units = stock_units + 4 where id = $1::bigint', [priceGroupId]);

    const { rows: subgroupRows } = await asUser(db, staffId, async () => db.query<{ subgroup_id: string; remaining_units: number }>(
      'select subgroup_id, remaining_units::integer from public.list_store_stock_subgroups($1::bigint)',
      [priceGroupId],
    ));
    const selected = subgroupRows.find((row) => row.remaining_units === 4);
    expect(selected).toBeDefined();

    const requestId = 'selected-cost-sale-1';
    const items = [{ priceGroupId, units: 3, sourceSubgroupId: String(selected!.subgroup_id) }];
    const staffReceipt = await callSaleItems(db, staffId, requestId, items);
    expect(staffReceipt).toMatchObject({ unitsSold: 3, totalCents: 3000 });
    expect(staffReceipt).not.toHaveProperty('costTotalCents');
    expect((staffReceipt.items as JsonRecord[])[0]).not.toHaveProperty('costTotalCents');

    const ownerRetry = await callSaleItems(db, ownerId, requestId, items);
    expect(ownerRetry).toMatchObject({ costTotalCents: 450, profitCents: 2550 });
    expect((ownerRetry.items as JsonRecord[])[0]).toHaveProperty('costTotalCents', 450);

    const { rows: remainingLots } = await db.query(
      'select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots order by id',
    );
    expect(remainingLots).toEqual([
      { unit_cost_cents: 400, remaining_units: 2 },
      { unit_cost_cents: 150, remaining_units: 0 },
      { unit_cost_cents: 150, remaining_units: 1 },
    ]);
  });

  it('keeps selected free-cost and unknown-cost subgroups distinct', async () => {
    await db.query(
      `insert into public.store_stock_lots (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
       values ($1::uuid, $2::bigint, 1, 1, 0), ($1::uuid, $2::bigint, 1, 1, null)`,
      [businessId, priceGroupId],
    );
    await db.query('update public.store_price_groups set stock_units = stock_units + 2 where id = $1::bigint', [priceGroupId]);

    const { rows } = await asUser(db, ownerId, async () => db.query<{ subgroup_id: string; unit_cost_cents: number | null }>(
      `select subgroup_id, unit_cost_cents::integer as unit_cost_cents
       from public.list_store_stock_subgroups($1::bigint)`,
      [priceGroupId],
    ));
    const free = rows.find((row) => row.unit_cost_cents === 0);
    const unknown = rows.find((row) => row.unit_cost_cents === null);
    expect(free).toBeDefined();
    expect(unknown).toBeDefined();

    await expect(callSaleItems(db, ownerId, 'free-subgroup-001', [
      { priceGroupId, units: 1, sourceSubgroupId: String(free!.subgroup_id) },
    ])).resolves.toMatchObject({ costTotalCents: 0, profitCents: 1000 });
    await expect(callSaleItems(db, ownerId, 'unknown-subgroup-001', [
      { priceGroupId, units: 1, sourceSubgroupId: String(unknown!.subgroup_id) },
    ])).resolves.toMatchObject({ costTotalCents: null, profitCents: null });
  });

  it('rolls back earlier subgroup consumption if a later subgroup token is invalid', async () => {
    await expect(callSaleItems(db, ownerId, 'invalid-subgroup-1', [
      { priceGroupId, units: 1, sourceSubgroupId: '1' },
      { priceGroupId, units: 1, sourceSubgroupId: '999999' },
    ])).rejects.toMatchObject({ code: 'P0001' });

    expect((await db.query('select remaining_units from public.store_stock_lots order by id')).rows)
      .toEqual([{ remaining_units: 2 }]);
    expect((await db.query('select stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ stock_units: 2 });
    expect((await db.query('select count(*)::integer as count from public.store_sales')).rows[0]).toMatchObject({ count: 0 });
  });

  it('rejects subgroup overdraw without changing stock, lots, or sales', async () => {
    await db.query(
      `insert into public.store_stock_lots (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
       values ($1::uuid, $2::bigint, 1, 1, 150)`,
      [businessId, priceGroupId],
    );
    await db.query('update public.store_price_groups set stock_units = stock_units + 1 where id = $1::bigint', [priceGroupId]);

    const { rows } = await asUser(db, ownerId, async () => db.query<{ subgroup_id: string }>(
      'select subgroup_id from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 150',
      [priceGroupId],
    ));
    const selectedSubgroupId = String(rows[0].subgroup_id);
    const beforeLots = await db.query('select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots order by id');

    await expect(callSaleItems(db, ownerId, 'subgroup-overdraw-1', [
      { priceGroupId, units: 2, sourceSubgroupId: selectedSubgroupId },
    ])).rejects.toMatchObject({ code: 'P0001' });

    expect((await db.query('select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots order by id')).rows)
      .toEqual(beforeLots.rows);
    expect((await db.query('select stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ stock_units: 3 });
    expect((await db.query('select count(*)::integer as count from public.store_sales')).rows[0]).toMatchObject({ count: 0 });
  });

  it('rejects a subgroup token from another price group without any sale or stock writes', async () => {
    const { rows: groupRows } = await db.query<{ id: string }>(
      `insert into public.store_price_groups (business_id, category_id, price_cents, stock_units, sort_order, photo_path)
       select business_id, category_id, 1500, 1, 1, ''
       from public.store_price_groups where id = $1::bigint returning id::text as id`,
      [priceGroupId],
    );
    const otherGroupId = Number(groupRows[0].id);
    await db.query(
      `insert into public.store_stock_lots (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
       values ($1::uuid, $2::bigint, 1, 1, 150)`,
      [businessId, otherGroupId],
    );
    const { rows: subgroupRows } = await asUser(db, ownerId, async () => db.query<{ subgroup_id: string }>(
      'select subgroup_id from public.list_store_stock_subgroups($1::bigint)',
      [otherGroupId],
    ));
    const beforeLots = await db.query('select price_group_id, remaining_units from public.store_stock_lots order by id');

    await expect(callSaleItems(db, ownerId, 'foreign-subgroup-1', [
      { priceGroupId, units: 1, sourceSubgroupId: subgroupRows[0].subgroup_id },
    ])).rejects.toMatchObject({ code: 'P0001' });

    expect((await db.query('select price_group_id, remaining_units from public.store_stock_lots order by id')).rows)
      .toEqual(beforeLots.rows);
    expect((await db.query('select count(*)::integer as count from public.store_sales')).rows[0]).toMatchObject({ count: 0 });
  });

  it('filters purchase-cost lots from staff-facing stock reads while retaining owner access', async () => {
    const readCosts = (userId: string) => asUser(db, userId, async () => {
      const { rows } = await db.query(
        `select lot.unit_cost_cents as cost
         from public.store_price_groups as price_group
         left join public.store_stock_lots as lot
           on lot.business_id = price_group.business_id
           and lot.price_group_id = price_group.id
         where price_group.id = $1::bigint`,
        [priceGroupId],
      );
      return rows.map((row) => columnValue(row, 'cost'));
    });

    await expect(readCosts(ownerId)).resolves.toEqual([400]);
    await expect(readCosts(staffId)).resolves.toEqual([null]);
  });

  it('lets an owner activate existing Auth accounts with either supported role', async () => {
    await expect(activateMember(db, ownerId, ' NEW-STAFF@example.test ', 'staff')).resolves.toBeUndefined();
    await expect(activateMember(db, ownerId, 'new-owner@example.test', 'owner')).resolves.toBeUndefined();

    const { rows } = await db.query(
      'select user_id::text, role from public.business_members where user_id in ($1::uuid, $2::uuid) order by user_id',
      [newStaffId, newOwnerId],
    );
    expect(rows).toEqual([
      { user_id: newStaffId, role: 'staff' },
      { user_id: newOwnerId, role: 'owner' },
    ]);
  });

  it('denies staff and nonmembers from activating accounts without changing memberships', async () => {
    const before = await db.query('select user_id::text, role from public.business_members order by user_id');

    await expect(activateMember(db, staffId, 'new-staff@example.test', 'staff'))
      .rejects.toMatchObject({ code: '42501' });
    await expect(activateMember(db, outsiderId, 'new-staff@example.test', 'staff'))
      .rejects.toMatchObject({ code: '42501' });

    const after = await db.query('select user_id::text, role from public.business_members order by user_id');
    expect(after.rows).toEqual(before.rows);
  });

  it('rejects unknown Auth emails, unsupported roles, and already-member accounts without changes', async () => {
    const before = await db.query('select user_id::text, role from public.business_members order by user_id');

    await expect(activateMember(db, ownerId, 'missing@example.test', 'staff'))
      .rejects.toMatchObject({ code: 'P0001' });
    await expect(activateMember(db, ownerId, 'new-staff@example.test', 'admin'))
      .rejects.toMatchObject({ code: '22023' });
    await expect(activateMember(db, ownerId, 'staff@example.test', 'owner'))
      .rejects.toMatchObject({ code: '23505' });

    const after = await db.query('select user_id::text, role from public.business_members order by user_id');
    expect(after.rows).toEqual(before.rows);
  });

  it('returns cost subgroup counts to sellers while hiding euro costs from staff', async () => {
    await db.query(
      `insert into public.store_stock_lots (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
       values ($1::uuid, $2::bigint, 2, 2, 250), ($1::uuid, $2::bigint, 3, 3, 150), ($1::uuid, $2::bigint, 1, 1, null)`,
      [businessId, priceGroupId],
    );
    await db.query('update public.store_price_groups set stock_units = stock_units + 6 where id = $1::bigint', [priceGroupId]);

    const readSubgroups = (userId: string) => asUser(db, userId, async () => {
      const { rows } = await db.query(
        `select subgroup_id, remaining_units::integer as remaining_units,
                unit_cost_cents::integer as unit_cost_cents
         from public.list_store_stock_subgroups($1::bigint)`,
        [priceGroupId],
      );
      return rows as JsonRecord[];
    });

    const ownerGroups = await readSubgroups(ownerId);
    expect(ownerGroups.map((row) => ({ remaining_units: row.remaining_units, unit_cost_cents: row.unit_cost_cents })))
      .toEqual([
        { remaining_units: 2, unit_cost_cents: 400 },
        { remaining_units: 2, unit_cost_cents: 250 },
        { remaining_units: 3, unit_cost_cents: 150 },
        { remaining_units: 1, unit_cost_cents: null },
      ]);

    const staffGroups = await readSubgroups(staffId);
    expect(staffGroups.map((row) => ({ subgroup_id: row.subgroup_id, remaining_units: row.remaining_units, unit_cost_cents: row.unit_cost_cents })))
      .toEqual(ownerGroups.map((row) => ({ subgroup_id: row.subgroup_id, remaining_units: row.remaining_units, unit_cost_cents: null })));

    await expect(readSubgroups(outsiderId)).rejects.toMatchObject({ code: '42501' });
  });

  it('removes only selected subgroup units with an adjustment and rolls back overdraw', async () => {
    await db.query(
      `insert into public.store_stock_lots (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
       values ($1::uuid, $2::bigint, 2, 2, 150)`,
      [businessId, priceGroupId],
    );
    await db.query('update public.store_price_groups set stock_units = stock_units + 2 where id = $1::bigint', [priceGroupId]);
    const { rows } = await asUser(db, ownerId, async () => db.query<{ subgroup_id: string }>(
      'select subgroup_id from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 150',
      [priceGroupId],
    ));
    const subgroupId = rows[0].subgroup_id;

    await asUser(db, ownerId, async () => db.query(
      'select public.remove_store_stock_subgroup_units($1::bigint, $2::text, $3::integer, $4::text)',
      [priceGroupId, subgroupId, 1, 'Unidad dañada'],
    ));
    const beforeOverdraw = await db.query('select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots order by id');
    await expect(asUser(db, ownerId, async () => db.query(
      'select public.remove_store_stock_subgroup_units($1::bigint, $2::text, $3::integer, $4::text)',
      [priceGroupId, subgroupId, 2, 'No debe exceder el subgrupo'],
    ))).rejects.toMatchObject({ code: 'P0001' });

    expect((await db.query('select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots order by id')).rows)
      .toEqual(beforeOverdraw.rows);
    expect((await db.query('select stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ stock_units: 3 });
    expect((await db.query("select units_delta, cost_total_cents, note from public.store_stock_movements where movement_type = 'ajuste'")).rows)
      .toEqual([{ units_delta: -1, cost_total_cents: 150, note: 'Unidad dañada' }]);
  });

  it('denies staff subgroup adjustments without changing stock or movements', async () => {
    const { rows } = await asUser(db, ownerId, async () => db.query<{ subgroup_id: string }>(
      'select subgroup_id from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 400',
      [priceGroupId],
    ));
    const subgroupId = rows[0].subgroup_id;
    const beforeLots = await db.query('select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots order by id');

    await expect(asUser(db, staffId, async () => db.query(
      'select public.remove_store_stock_subgroup_units($1::bigint, $2::text, $3::integer, $4::text)',
      [priceGroupId, subgroupId, 1, 'Sin permiso'],
    ))).rejects.toMatchObject({ code: '42501' });
    await expect(asUser(db, staffId, async () => db.query(
      'select public.correct_store_stock_subgroup_cost($1::bigint, $2::text, $3::bigint)',
      [priceGroupId, subgroupId, 250],
    ))).rejects.toMatchObject({ code: '42501' });

    expect((await db.query('select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots order by id')).rows)
      .toEqual(beforeLots.rows);
    expect((await db.query('select stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ stock_units: 2 });
    expect((await db.query("select count(*)::integer as count from public.store_stock_movements where movement_type = 'ajuste'")).rows[0])
      .toMatchObject({ count: 0 });
  });

  it('corrects only remaining units in a cost subgroup with compensating adjustments', async () => {
    const { rows: subgroupRows } = await asUser(db, ownerId, async () => db.query<{ subgroup_id: string }>(
      'select subgroup_id from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 400',
      [priceGroupId],
    ));
    await asUser(db, ownerId, async () => db.query(
      'select public.correct_store_stock_subgroup_cost($1::bigint, $2::text, $3::bigint)',
      [priceGroupId, subgroupRows[0].subgroup_id, 250],
    ));

    expect((await db.query('select stock_units from public.store_price_groups where id = $1::bigint', [priceGroupId])).rows[0])
      .toMatchObject({ stock_units: 2 });
    expect((await db.query('select unit_cost_cents::integer as unit_cost_cents, remaining_units from public.store_stock_lots where price_group_id = $1::bigint order by id', [priceGroupId])).rows)
      .toEqual([
        { unit_cost_cents: 400, remaining_units: 0 },
        { unit_cost_cents: 250, remaining_units: 2 },
      ]);
    expect((await db.query("select units_delta, cost_total_cents from public.store_stock_movements where movement_type = 'ajuste' order by id")).rows)
      .toEqual([
        { units_delta: -2, cost_total_cents: 800 },
        { units_delta: 2, cost_total_cents: 500 },
      ]);
  });

  it('restores the exact FIFO subgroup lots, preserves the sale, and excludes it from net summaries', async () => {
    const subgroup = await asUser(db, ownerId, async () => db.query<{ subgroup_id: string }>(
      'select subgroup_id from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 400',
      [priceGroupId],
    ));
    const originalSubgroupId = subgroup.rows[0].subgroup_id;
    const secondLot = await db.query<{ id: number }>(
      `insert into public.store_stock_lots (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
       values ($1::uuid, $2::bigint, 3, 3, 400) returning id`,
      [businessId, priceGroupId],
    );
    await db.query('update public.store_price_groups set stock_units = stock_units + 3 where id = $1::bigint', [priceGroupId]);

    const requestId = 'undo-fifo-sale-1';
    const items = [{ priceGroupId, units: 3, sourceSubgroupId: originalSubgroupId }];
    const sale = await callSaleItems(db, ownerId, requestId, items);
    expect(sale).toHaveProperty('undoAvailable', true);
    const saleId = Number(sale.saleId);
    await expect(callTodaySummary(db, ownerId)).resolves.toMatchObject({ totalCents: 3000, unitsSold: 3, costTotalCents: 1200 });

    const firstUndo = await callUndo(db, ownerId, saleId);
    expect(firstUndo).toMatchObject({ saleId, status: 'undone', unitsRestored: 3 });
    const movementHistory = await asUser(db, ownerId, async () => db.query<{ movement_type: string; units_delta: number; sale_id: number; cost_total_cents: number | null; note: string }>(
      'select movement_type, units_delta, sale_id, cost_total_cents, note from public.store_stock_movements where sale_id = $1::bigint order by id',
      [saleId],
    ));
    expect(movementHistory.rows).toEqual([
      { movement_type: 'venta', units_delta: -3, sale_id: saleId, cost_total_cents: 1200, note: '' },
      { movement_type: 'ajuste', units_delta: 2, sale_id: saleId, cost_total_cents: 800, note: `Deshacer venta ${saleId}: reposición del lote FIFO ${originalSubgroupId}.` },
      { movement_type: 'ajuste', units_delta: 1, sale_id: saleId, cost_total_cents: 400, note: `Deshacer venta ${saleId}: reposición del lote FIFO ${secondLot.rows[0].id}.` },
    ]);
    await expect(callTodaySummary(db, ownerId)).resolves.toMatchObject({ totalCents: 0, unitsSold: 0, costTotalCents: 0, profitCents: 0 });
    const { rows: dashboardRows } = await asUser(db, ownerId, async () => db.query(
      'select public.get_store_dashboard_summary(null::bigint) as result',
    ));
    expect(columnValue(dashboardRows[0], 'result')).toMatchObject({ unitsSold: 0, revenueCents: 0, soldCostCents: 0 });

    const restored = await asUser(db, ownerId, async () => db.query<{ subgroup_id: string; remaining_units: number; unit_cost_cents: number }>(
      `select subgroup_id, remaining_units::integer as remaining_units, unit_cost_cents::integer as unit_cost_cents
       from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 400`,
      [priceGroupId],
    ));
    expect(restored.rows).toEqual([{ subgroup_id: originalSubgroupId, remaining_units: 5, unit_cost_cents: 400 }]);

    await expect(callSaleItems(db, ownerId, requestId, items)).resolves.toEqual(sale);
    await expect(callUndo(db, ownerId, saleId)).resolves.toEqual(firstUndo);
    await expect(asUser(db, ownerId, async () => db.query(
      'select subgroup_id, remaining_units::integer as remaining_units from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 400',
      [priceGroupId],
    ))).resolves.toMatchObject({ rows: [{ subgroup_id: originalSubgroupId, remaining_units: 5 }] });
  });

  it('allows a seller to undo their own sale but not another seller\'s sale', async () => {
    const ownerSale = await callSale(db, ownerId, 'owner-undo-sale-1', priceGroupId);
    const saleId = Number(ownerSale.saleId);
    await expect(callUndo(db, staffId, saleId)).rejects.toMatchObject({ code: '42501' });
    const afterDenied = await asUser(db, ownerId, async () => db.query<{ remaining_units: number }>(
      'select remaining_units::integer as remaining_units from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 400',
      [priceGroupId],
    ));
    expect(afterDenied.rows).toEqual([{ remaining_units: 1 }]);
    await expect(callUndo(db, ownerId, saleId)).resolves.toMatchObject({ status: 'undone', unitsRestored: 1 });

    const staffSale = await callSale(db, staffId, 'staff-undo-sale-1', priceGroupId);
    expect(staffSale).toHaveProperty('undoAvailable', true);
    expect(staffSale).not.toHaveProperty('costTotalCents');
    const staffUndo = await callUndo(db, staffId, Number(staffSale.saleId));
    expect(staffUndo).toMatchObject({ status: 'undone', unitsRestored: 1 });
    expect(staffUndo).not.toHaveProperty('costTotalCents');
    expect(staffUndo).not.toHaveProperty('unitCostCents');
    await expect(callTodaySummary(db, ownerId)).resolves.toMatchObject({ totalCents: 0, unitsSold: 0 });
  });

  it('grants sale undo only to authenticated callers', async () => {
    const { rows } = await db.query(
      `select
        has_function_privilege('anon', 'public.undo_store_sale(bigint)', 'execute') as anon_execute,
        has_function_privilege('authenticated', 'public.undo_store_sale(bigint)', 'execute') as authenticated_execute`,
    );
    expect(rows[0]).toEqual({ anon_execute: false, authenticated_execute: true });
    await expect(callUndo(db, outsiderId, 1)).rejects.toMatchObject({ code: '42501' });
  });

  it('rejects an expired undo window without changing stock or net sales', async () => {
    const sale = await callSale(db, ownerId, 'expired-undo-sale', priceGroupId);
    const saleId = Number(sale.saleId);
    await db.query(
      "update public.store_sales set sold_at = now() - interval '1 minute' where id = $1::bigint",
      [saleId],
    );

    await expect(callUndo(db, ownerId, saleId)).rejects.toMatchObject({ code: 'P0001' });
    const { rows } = await asUser(db, ownerId, async () => db.query<{ remaining_units: number }>(
      'select remaining_units::integer as remaining_units from public.list_store_stock_subgroups($1::bigint) where unit_cost_cents = 400',
      [priceGroupId],
    ));
    expect(rows).toEqual([{ remaining_units: 1 }]);
    await expect(callTodaySummary(db, ownerId)).resolves.toMatchObject({ totalCents: 1000, unitsSold: 1 });
  });

  it('does not grant authenticated users direct execution of private sale helpers', async () => {
    await expect(asUser(db, staffId, () => db.query(
      "select private.staff_safe_sale_receipt('{}'::jsonb)",
    ))).rejects.toMatchObject({ code: '42501' });
    await expect(asUser(db, staffId, () => db.query(
      "select private.complete_store_sale_impl('[]'::jsonb, null)",
    ))).rejects.toMatchObject({ code: '42501' });
  });
});
