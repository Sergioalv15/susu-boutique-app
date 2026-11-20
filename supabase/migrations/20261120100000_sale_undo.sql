alter table public.store_sales
  add column created_by_user_id uuid references auth.users(id) on delete set null;

create table public.store_sale_lot_allocations (
  business_id uuid not null default private.current_business_id()
    references public.businesses(id) on delete cascade,
  sale_id bigint not null,
  price_group_id bigint not null,
  stock_lot_id bigint not null references public.store_stock_lots(id) on delete restrict,
  units_consumed integer not null check (units_consumed > 0),
  unit_cost_cents bigint check (unit_cost_cents is null or unit_cost_cents >= 0),
  created_at timestamptz not null default now(),
  primary key (business_id, sale_id, stock_lot_id),
  foreign key (business_id, sale_id)
    references public.store_sales (business_id, id) on delete cascade,
  foreign key (business_id, price_group_id)
    references public.store_price_groups (business_id, id) on delete restrict
);
create index store_sale_lot_allocations_business_sale_group_idx
  on public.store_sale_lot_allocations (business_id, sale_id, price_group_id);
alter table public.store_sale_lot_allocations enable row level security;
revoke all on table public.store_sale_lot_allocations from public, anon, authenticated;

create table public.store_sale_reversals (
  business_id uuid not null default private.current_business_id()
    references public.businesses(id) on delete cascade,
  sale_id bigint not null,
  reversed_by_user_id uuid not null,
  reversed_at timestamptz not null default now(),
  units_restored bigint not null check (units_restored > 0),
  primary key (business_id, sale_id),
  foreign key (business_id, sale_id)
    references public.store_sales (business_id, id) on delete cascade
);
alter table public.store_sale_reversals enable row level security;
revoke all on table public.store_sale_reversals from public, anon, authenticated;

-- The latest subgroup-aware sale implementation is copied and amended below.
create or replace function private.complete_store_sale_impl(p_items jsonb, p_request_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_item jsonb;
  v_group record;
  v_lot record;
  v_existing public.store_sales;
  v_group_id bigint;
  v_source_subgroup_id bigint;
  v_source_cost bigint;
  v_source_subgroup_selected boolean;
  v_units integer;
  v_requested_units integer;
  v_input_groups integer;
  v_locked_groups integer := 0;
  v_needed integer;
  v_taken integer;
  v_base_price bigint;
  v_group_stock integer;
  v_unit_price bigint;
  v_line_total bigint;
  v_line_total_exact numeric;
  v_line_cost bigint;
  v_line_cost_exact numeric;
  v_line_cost_known boolean;
  v_cost_known boolean := true;
  v_total_cents bigint := 0;
  v_cost_total_cents bigint := 0;
  v_units_sold bigint := 0;
  v_receipt_items jsonb := '[]'::jsonb;
  v_receipt jsonb;
  v_sale_id bigint;
  v_first_item jsonb;
  v_movement record;
  v_lot_allocations jsonb := '[]'::jsonb;
  v_allocation record;
begin
  if v_business_id is null then
    raise exception using errcode = '42501', message = 'Business membership required.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception using errcode = '22023', message = 'Sale must contain between 1 and 100 items.';
  end if;
  if p_request_id is not null and p_request_id !~ '^[A-Za-z0-9_-]{8,100}$' then
    raise exception using errcode = '22023', message = 'Request id is invalid.';
  end if;

  if p_request_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_business_id::text || ':' || p_request_id, 0)
    );
    select * into v_existing
    from public.store_sales
    where business_id = v_business_id and request_id = p_request_id;
    if found then
      if v_existing.request_payload is distinct from p_items then
        raise exception using errcode = 'P0001', message = 'Request id was already used for a different sale.';
      end if;
      return v_existing.request_receipt;
    end if;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value) loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item -> 'priceGroupId') <> 'number'
       or jsonb_typeof(v_item -> 'units') <> 'number' then
      raise exception using errcode = '22023', message = 'Sale item is invalid.';
    end if;
    if (v_item ->> 'priceGroupId') !~ '^[1-9][0-9]*$'
       or (v_item ->> 'units') !~ '^[1-9][0-9]*$' then
      raise exception using errcode = '22023', message = 'Sale item ids and units must be positive integers.';
    end if;
    if v_item ? 'sourceSubgroupId' then
      if jsonb_typeof(v_item -> 'sourceSubgroupId') <> 'string'
         or (v_item ->> 'sourceSubgroupId') !~ '^[1-9][0-9]*$' then
        raise exception using errcode = '22023', message = 'Source subgroup id is invalid.';
      end if;
      if (v_item ->> 'sourceSubgroupId')::numeric > 9223372036854775807::numeric then
        raise exception using errcode = '22003', message = 'Source subgroup id exceeds the supported limit.';
      end if;
    end if;
    if v_item ? 'unitPriceCents' and jsonb_typeof(v_item -> 'unitPriceCents') <> 'null' then
      if jsonb_typeof(v_item -> 'unitPriceCents') <> 'number'
         or (v_item ->> 'unitPriceCents') !~ '^[1-9][0-9]*$' then
        raise exception using errcode = '22023', message = 'Unit price must be a positive integer.';
      end if;
      if (v_item ->> 'unitPriceCents')::numeric > 9007199254740991 then
        raise exception using errcode = '22003', message = 'Unit price exceeds the supported limit.';
      end if;
    end if;
    if (v_item ->> 'units')::numeric > 2147483647 then
      raise exception using errcode = '22003', message = 'Units exceed the supported limit.';
    end if;
  end loop;

  select count(distinct (items.value ->> 'priceGroupId')::bigint)
  into v_input_groups
  from jsonb_array_elements(p_items) as items(value);

  for v_group in
    select price_group.id, price_group.price_cents, price_group.stock_units
    from public.store_price_groups as price_group
    join public.store_categories as category
      on category.business_id = price_group.business_id
      and category.id = price_group.category_id
    where price_group.business_id = v_business_id
      and price_group.is_active
      and category.is_active
      and price_group.id in (
        select distinct (items.value ->> 'priceGroupId')::bigint
        from jsonb_array_elements(p_items) as items(value)
      )
    order by price_group.id
    for update of price_group
  loop
    v_locked_groups := v_locked_groups + 1;
    select sum((items.value ->> 'units')::integer)::integer
    into v_requested_units
    from jsonb_array_elements(p_items) as items(value)
    where (items.value ->> 'priceGroupId')::bigint = v_group.id;
    if v_group.stock_units < v_requested_units then
      raise exception using errcode = 'P0001', message = format('Only %s units remain.', v_group.stock_units);
    end if;
  end loop;
  if v_locked_groups <> v_input_groups then
    raise exception using errcode = 'P0001', message = 'A price group is unavailable.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value) loop
    v_group_id := (v_item ->> 'priceGroupId')::bigint;
    v_units := (v_item ->> 'units')::integer;
    select price_group.price_cents, price_group.stock_units
    into v_base_price, v_group_stock
    from public.store_price_groups as price_group
    where price_group.business_id = v_business_id and price_group.id = v_group_id;

    v_unit_price := coalesce(nullif(v_item ->> 'unitPriceCents', 'null')::bigint, v_base_price);
    v_line_total_exact := v_unit_price::numeric * v_units::numeric;
    if v_line_total_exact <= 0 or v_line_total_exact > 9007199254740991 then
      raise exception using errcode = '22003', message = 'Sale total exceeds the supported limit.';
    end if;
    v_line_total := v_line_total_exact::bigint;

    select sum((items.value ->> 'units')::integer)::integer
    into v_requested_units
    from jsonb_array_elements(p_items) as items(value)
    where (items.value ->> 'priceGroupId')::bigint = v_group_id;

    v_source_subgroup_selected := v_item ? 'sourceSubgroupId';
    v_source_subgroup_id := null;
    v_source_cost := null;
    if v_source_subgroup_selected then
      v_source_subgroup_id := (v_item ->> 'sourceSubgroupId')::bigint;
      select lot.unit_cost_cents
      into v_source_cost
      from public.store_stock_lots as lot
      where lot.business_id = v_business_id
        and lot.price_group_id = v_group_id
        and lot.id = v_source_subgroup_id;
      if not found then
        raise exception using errcode = 'P0001', message = 'Selected stock subgroup is unavailable.';
      end if;
    end if;

    v_needed := v_units;
    v_line_cost := 0;
    v_line_cost_exact := 0;
    v_line_cost_known := true;

    for v_lot in
      select lot.id, lot.remaining_units, lot.unit_cost_cents
      from public.store_stock_lots as lot
      where lot.business_id = v_business_id
        and lot.price_group_id = v_group_id
        and lot.remaining_units > 0
        and (
          not v_source_subgroup_selected
          or lot.unit_cost_cents is not distinct from v_source_cost
        )
      order by lot.id
      for update
    loop
      exit when v_needed = 0;
      v_taken := least(v_lot.remaining_units, v_needed);
      if v_lot.unit_cost_cents is null then
        v_line_cost_known := false;
      else
        v_line_cost_exact := v_line_cost_exact + v_lot.unit_cost_cents::numeric * v_taken::numeric;
        if v_line_cost_exact > 9007199254740991 then
          raise exception using errcode = '22003', message = 'Sale cost exceeds the supported limit.';
        end if;
      end if;
      update public.store_stock_lots
      set remaining_units = remaining_units - v_taken
      where business_id = v_business_id and id = v_lot.id;
      v_lot_allocations := v_lot_allocations || jsonb_build_array(jsonb_build_object(
        'priceGroupId', v_group_id,
        'stockLotId', v_lot.id,
        'units', v_taken,
        'unitCostCents', v_lot.unit_cost_cents
      ));
      v_needed := v_needed - v_taken;
    end loop;
    if v_needed <> 0 then
      raise exception using errcode = 'P0001', message = 'Selected stock subgroup does not have enough units.';
    end if;
    if not v_line_cost_known then
      v_line_cost := null;
      v_cost_known := false;
    else
      v_line_cost := v_line_cost_exact::bigint;
      v_cost_total_cents := v_cost_total_cents + v_line_cost;
      if v_cost_total_cents > 9007199254740991 then
        raise exception using errcode = '22003', message = 'Sale cost exceeds the supported limit.';
      end if;
    end if;

    v_total_cents := v_total_cents + v_line_total;
    v_units_sold := v_units_sold + v_units;
    if v_total_cents > 9007199254740991 then
      raise exception using errcode = '22003', message = 'Sale total exceeds the supported limit.';
    end if;

    v_receipt_items := v_receipt_items || jsonb_build_array(jsonb_build_object(
      'priceGroupId', v_group_id,
      'units', v_units,
      'baseUnitPriceCents', v_base_price,
      'unitPriceCents', v_unit_price,
      'totalCents', v_line_total,
      'costTotalCents', v_line_cost,
      'remainingUnits', v_group_stock - v_requested_units
    ));
  end loop;

  insert into public.store_sales (
    business_id, sold_at, total_cents, request_id, request_payload, created_by_user_id
  ) values (
    v_business_id, now(), v_total_cents, p_request_id, case when p_request_id is null then null else p_items end, auth.uid()
  ) returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(v_receipt_items) as items(value) loop
    insert into public.store_sale_items (
      business_id, sale_id, price_group_id, units_sold, base_unit_price_cents,
      unit_price_cents, total_cents, cost_total_cents
    ) values (
      v_business_id,
      v_sale_id,
      (v_item ->> 'priceGroupId')::bigint,
      (v_item ->> 'units')::integer,
      (v_item ->> 'baseUnitPriceCents')::bigint,
      (v_item ->> 'unitPriceCents')::bigint,
      (v_item ->> 'totalCents')::bigint,
      nullif(v_item ->> 'costTotalCents', 'null')::bigint
    );
  end loop;

  for v_allocation in
    select
      (allocation.value ->> 'priceGroupId')::bigint as price_group_id,
      (allocation.value ->> 'stockLotId')::bigint as stock_lot_id,
      sum((allocation.value ->> 'units')::integer)::integer as units_consumed,
      nullif(allocation.value ->> 'unitCostCents', 'null')::bigint as unit_cost_cents
    from jsonb_array_elements(v_lot_allocations) as allocation(value)
    group by
      (allocation.value ->> 'priceGroupId')::bigint,
      (allocation.value ->> 'stockLotId')::bigint,
      nullif(allocation.value ->> 'unitCostCents', 'null')::bigint
    order by stock_lot_id
  loop
    insert into public.store_sale_lot_allocations (
      business_id, sale_id, price_group_id, stock_lot_id, units_consumed, unit_cost_cents
    ) values (
      v_business_id, v_sale_id, v_allocation.price_group_id, v_allocation.stock_lot_id,
      v_allocation.units_consumed, v_allocation.unit_cost_cents
    );
  end loop;

  for v_group_id in
    select distinct (items.value ->> 'priceGroupId')::bigint
    from jsonb_array_elements(v_receipt_items) as items(value)
    order by 1
  loop
    select sum((items.value ->> 'units')::integer)::integer as units,
           sum((items.value ->> 'totalCents')::bigint)::bigint as charged_total,
           case when count(*) = count(nullif(items.value ->> 'costTotalCents', 'null'))
             then sum((items.value ->> 'costTotalCents')::bigint)::bigint else null end as cost_total
    into v_movement
    from jsonb_array_elements(v_receipt_items) as items(value)
    where (items.value ->> 'priceGroupId')::bigint = v_group_id;

    update public.store_price_groups
    set stock_units = stock_units - v_movement.units
    where business_id = v_business_id and id = v_group_id;

    insert into public.store_stock_movements (
      business_id, price_group_id, movement_type, units_delta, sale_id,
      cost_total_cents, charged_total_cents
    ) values (
      v_business_id, v_group_id, 'venta', -v_movement.units, v_sale_id,
      v_movement.cost_total, v_movement.charged_total
    );
  end loop;

  v_first_item := v_receipt_items -> 0;
  v_receipt := jsonb_build_object(
    'saleId', v_sale_id,
    'unitsSold', v_units_sold,
    'unitPriceCents', (v_first_item ->> 'unitPriceCents')::bigint,
    'totalCents', v_total_cents,
    'remainingUnits', (v_first_item ->> 'remainingUnits')::integer,
    'items', v_receipt_items,
    'costTotalCents', case when v_cost_known then to_jsonb(v_cost_total_cents) else 'null'::jsonb end,
    'profitCents', case when v_cost_known then to_jsonb(v_total_cents - v_cost_total_cents) else 'null'::jsonb end,
    'undoAvailable', true
  );
  update public.store_sales
  set request_receipt = v_receipt
  where business_id = v_business_id and id = v_sale_id;

  return v_receipt;
end;
$$;
revoke all on function private.complete_store_sale_impl(jsonb, text) from public, anon, authenticated;

create function public.undo_store_sale(p_sale_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_user_id uuid := auth.uid();
  v_sale public.store_sales;
  v_existing public.store_sale_reversals;
  v_group record;
  v_locked_group public.store_price_groups;
  v_lot record;
  v_units_restored bigint := 0;
  v_cost_exact numeric;
  v_cost_total bigint;
begin
  if v_business_id is null or v_user_id is null or not private.is_business_member(v_business_id) then
    raise exception using errcode = '42501', message = 'Se requiere una cuenta activa del negocio.';
  end if;
  if p_sale_id is null or p_sale_id <= 0 then
    raise exception using errcode = '22023', message = 'El identificador de venta no es válido.';
  end if;

  select * into v_sale
  from public.store_sales as sale
  where sale.business_id = v_business_id and sale.id = p_sale_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'La venta no está disponible para deshacer.';
  end if;
  if v_sale.created_by_user_id is distinct from v_user_id then
    raise exception using errcode = '42501', message = 'Solo quien registró la venta puede deshacerla desde su aviso.';
  end if;

  select * into v_existing
  from public.store_sale_reversals as reversal
  where reversal.business_id = v_business_id and reversal.sale_id = p_sale_id
  for update;
  if found then
    return jsonb_build_object(
      'saleId', p_sale_id,
      'status', 'undone',
      'unitsRestored', v_existing.units_restored
    );
  end if;

  if v_sale.sold_at < now() - interval '30 seconds' then
    raise exception using errcode = 'P0001', message = 'El aviso para deshacer la venta ya caducó.';
  end if;

  select coalesce(sum(allocation.units_consumed), 0)::bigint
  into v_units_restored
  from public.store_sale_lot_allocations as allocation
  where allocation.business_id = v_business_id and allocation.sale_id = p_sale_id;
  if v_units_restored <= 0 then
    raise exception using errcode = 'P0001', message = 'La venta no tiene asignaciones FIFO que se puedan restaurar.';
  end if;

  for v_group in
    select allocation.price_group_id,
           sum(allocation.units_consumed)::bigint as units
    from public.store_sale_lot_allocations as allocation
    where allocation.business_id = v_business_id and allocation.sale_id = p_sale_id
    group by allocation.price_group_id
    order by allocation.price_group_id
  loop
    select * into v_locked_group
    from public.store_price_groups as price_group
    where price_group.business_id = v_business_id
      and price_group.id = v_group.price_group_id
      and price_group.is_active
    for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'No se puede restaurar el stock porque el grupo ya no está activo.';
    end if;
    if v_locked_group.stock_units::bigint + v_group.units > 2147483647 then
      raise exception using errcode = '22003', message = 'La reposición supera el límite de unidades del grupo.';
    end if;
  end loop;

  for v_lot in
    select allocation.stock_lot_id,
           allocation.price_group_id,
           allocation.units_consumed,
           allocation.unit_cost_cents,
           lot.business_id as lot_business_id,
           lot.price_group_id as lot_price_group_id,
           lot.remaining_units,
           lot.received_units,
           lot.unit_cost_cents as lot_unit_cost_cents
    from public.store_sale_lot_allocations as allocation
    join public.store_stock_lots as lot on lot.id = allocation.stock_lot_id
    where allocation.business_id = v_business_id and allocation.sale_id = p_sale_id
    order by allocation.stock_lot_id
    for update of lot
  loop
    if v_lot.lot_business_id is distinct from v_business_id
       or v_lot.lot_price_group_id is distinct from v_lot.price_group_id
       or v_lot.lot_unit_cost_cents is distinct from v_lot.unit_cost_cents then
      raise exception using errcode = 'P0001', message = 'Los lotes ya no coinciden con la venta registrada.';
    end if;
    if v_lot.remaining_units + v_lot.units_consumed > v_lot.received_units then
      raise exception using errcode = 'P0001', message = 'La reposición excedería las unidades recibidas del lote.';
    end if;

    update public.store_stock_lots as lot
    set remaining_units = lot.remaining_units + v_lot.units_consumed
    where lot.business_id = v_business_id and lot.id = v_lot.stock_lot_id;

    v_cost_total := null;
    if v_lot.unit_cost_cents is not null then
      v_cost_exact := v_lot.unit_cost_cents::numeric * v_lot.units_consumed::numeric;
      if v_cost_exact > 9007199254740991 then
        raise exception using errcode = '22003', message = 'El coste restaurado supera el límite admitido.';
      end if;
      v_cost_total := v_cost_exact::bigint;
    end if;

    insert into public.store_stock_movements (
      business_id, price_group_id, movement_type, units_delta, sale_id, note, cost_total_cents
    ) values (
      v_business_id,
      v_lot.price_group_id,
      'ajuste',
      v_lot.units_consumed,
      p_sale_id,
      format('Deshacer venta %s: reposición del lote FIFO %s.', p_sale_id, v_lot.stock_lot_id),
      v_cost_total
    );
  end loop;

  for v_group in
    select allocation.price_group_id,
           sum(allocation.units_consumed)::bigint as units
    from public.store_sale_lot_allocations as allocation
    where allocation.business_id = v_business_id and allocation.sale_id = p_sale_id
    group by allocation.price_group_id
    order by allocation.price_group_id
  loop
    update public.store_price_groups as price_group
    set stock_units = price_group.stock_units + v_group.units::integer
    where price_group.business_id = v_business_id
      and price_group.id = v_group.price_group_id
      and price_group.is_active;
  end loop;

  insert into public.store_sale_reversals (
    business_id, sale_id, reversed_by_user_id, units_restored
  ) values (
    v_business_id, p_sale_id, v_user_id, v_units_restored
  );

  return jsonb_build_object(
    'saleId', p_sale_id,
    'status', 'undone',
    'unitsRestored', v_units_restored
  );
end;
$$;
revoke all on function public.undo_store_sale(bigint) from public, anon;
grant execute on function public.undo_store_sale(bigint) to authenticated;

create or replace function public.get_store_dashboard_summary(p_category_id bigint default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_summary jsonb;
begin
  select jsonb_build_object(
    'unitsSold', coalesce(sum(item.units_sold), 0),
    'revenueCents', coalesce(sum(item.total_cents), 0),
    'soldCostCents', case
      when count(item.id) <> count(item.cost_total_cents) then null
      else coalesce(sum(item.cost_total_cents), 0)
    end
  )
  into v_summary
  from public.store_sale_items as item
  join public.store_sales as sale
    on sale.business_id = item.business_id and sale.id = item.sale_id
  join public.store_price_groups as price_group
    on price_group.business_id = item.business_id
    and price_group.id = item.price_group_id
  where item.business_id = v_business_id
    and (p_category_id is null or price_group.category_id = p_category_id)
    and not exists (
      select 1 from public.store_sale_reversals as reversal
      where reversal.business_id = sale.business_id and reversal.sale_id = sale.id
    );

  return v_summary;
end;
$$;
revoke all on function public.get_store_dashboard_summary(bigint) from public, anon;
grant execute on function public.get_store_dashboard_summary(bigint) to authenticated;

create or replace function public.get_store_today_summary(
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_summary jsonb;
begin
  if p_start is null or p_end is null or p_start >= p_end then
    raise exception using errcode = '22023', message = 'Summary date range is invalid.';
  end if;

  select jsonb_build_object(
    'totalCents', coalesce(sum(item.total_cents), 0),
    'unitsSold', coalesce(sum(item.units_sold), 0),
    'costTotalCents', case
      when count(item.id) <> count(item.cost_total_cents) then null
      else coalesce(sum(item.cost_total_cents), 0)
    end,
    'profitCents', case
      when count(item.id) <> count(item.cost_total_cents) then null
      else coalesce(sum(item.total_cents), 0) - coalesce(sum(item.cost_total_cents), 0)
    end
  )
  into v_summary
  from public.store_sales as sale
  join public.store_sale_items as item
    on item.business_id = sale.business_id and item.sale_id = sale.id
  where sale.business_id = v_business_id
    and sale.sold_at >= p_start
    and sale.sold_at < p_end
    and not exists (
      select 1 from public.store_sale_reversals as reversal
      where reversal.business_id = sale.business_id and reversal.sale_id = sale.id
    );

  return v_summary;
end;
$$;
revoke all on function public.get_store_today_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_store_today_summary(timestamptz, timestamptz) to authenticated;
