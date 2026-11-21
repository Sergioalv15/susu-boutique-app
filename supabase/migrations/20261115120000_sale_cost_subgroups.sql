-- Optional sourceSubgroupId selects a purchase-cost bucket. Legacy callers omit it and retain global FIFO.
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
    business_id, sold_at, total_cents, request_id, request_payload
  ) values (
    v_business_id, now(), v_total_cents, p_request_id, case when p_request_id is null then null else p_items end
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
    'profitCents', case when v_cost_known then to_jsonb(v_total_cents - v_cost_total_cents) else 'null'::jsonb end
  );
  update public.store_sales
  set request_receipt = v_receipt
  where business_id = v_business_id and id = v_sale_id;

  return v_receipt;
end;
$$;
