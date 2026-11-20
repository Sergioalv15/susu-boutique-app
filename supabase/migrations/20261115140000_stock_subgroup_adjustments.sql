create function public.remove_store_stock_subgroup_units(
  p_price_group_id bigint,
  p_subgroup_id text,
  p_units integer,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_group public.store_price_groups;
  v_source_subgroup_id bigint;
  v_source_cost bigint;
  v_lot_units bigint;
  v_needed integer;
  v_taken integer;
  v_cost_exact numeric;
  v_cost_total bigint;
  v_lot record;
  v_note text := btrim(coalesce(p_note, ''));
begin
  if p_price_group_id is null or p_price_group_id <= 0 then
    raise exception using errcode = '22023', message = 'Price group id must be positive.';
  end if;
  if p_subgroup_id is null or p_subgroup_id !~ '^[1-9][0-9]*$' then
    raise exception using errcode = '22023', message = 'Stock subgroup id is invalid.';
  end if;
  if (p_subgroup_id)::numeric > 9223372036854775807::numeric then
    raise exception using errcode = '22003', message = 'Stock subgroup id exceeds the supported limit.';
  end if;
  if p_units is null or p_units <= 0 then
    raise exception using errcode = '22023', message = 'Adjustment units must be positive.';
  end if;
  if char_length(v_note) > 200 then
    raise exception using errcode = '22023', message = 'Adjustment note cannot exceed 200 characters.';
  end if;

  v_source_subgroup_id := p_subgroup_id::bigint;
  select * into v_group
  from public.store_price_groups as price_group
  where price_group.business_id = v_business_id
    and price_group.id = p_price_group_id
    and price_group.is_active
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Price group is unavailable.';
  end if;

  select lot.unit_cost_cents
  into v_source_cost
  from public.store_stock_lots as lot
  where lot.business_id = v_business_id
    and lot.price_group_id = p_price_group_id
    and lot.id = v_source_subgroup_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'Stock subgroup is unavailable.';
  end if;

  select coalesce(sum(lot.remaining_units), 0)::bigint
  into v_lot_units
  from public.store_stock_lots as lot
  where lot.business_id = v_business_id and lot.price_group_id = p_price_group_id;
  if v_lot_units <> v_group.stock_units then
    raise exception using errcode = 'P0001', message = 'Stock lots do not match the available stock.';
  end if;
  if v_group.stock_units < p_units then
    raise exception using errcode = 'P0001', message = 'Adjustment exceeds the available stock.';
  end if;

  v_needed := p_units;
  for v_lot in
    select lot.id, lot.remaining_units, lot.unit_cost_cents
    from public.store_stock_lots as lot
    where lot.business_id = v_business_id
      and lot.price_group_id = p_price_group_id
      and lot.remaining_units > 0
      and lot.unit_cost_cents is not distinct from v_source_cost
    order by lot.id
    for update
  loop
    exit when v_needed = 0;
    v_taken := least(v_lot.remaining_units, v_needed);
    update public.store_stock_lots as lot
    set remaining_units = remaining_units - v_taken
    where lot.business_id = v_business_id and lot.id = v_lot.id;
    v_needed := v_needed - v_taken;
  end loop;

  if v_needed <> 0 then
    raise exception using errcode = 'P0001', message = 'Selected subgroup does not have enough units.';
  end if;

  v_cost_total := null;
  if v_source_cost is not null then
    v_cost_exact := v_source_cost::numeric * p_units::numeric;
    if v_cost_exact > 9007199254740991 then
      raise exception using errcode = '22003', message = 'Adjustment cost exceeds the supported limit.';
    end if;
    v_cost_total := v_cost_exact::bigint;
  end if;

  update public.store_price_groups
  set stock_units = stock_units - p_units
  where business_id = v_business_id and id = p_price_group_id
  returning * into v_group;

  insert into public.store_stock_movements (
    business_id, price_group_id, movement_type, units_delta, note, cost_total_cents
  ) values (
    v_business_id, p_price_group_id, 'ajuste', -p_units,
    coalesce(nullif(v_note, ''), 'Ajuste de stock.'), v_cost_total
  );

  return jsonb_build_object(
    'priceGroupId', p_price_group_id,
    'subgroupId', p_subgroup_id,
    'unitsRemoved', p_units,
    'stockUnits', v_group.stock_units,
    'costTotalCents', v_cost_total
  );
end;
$$;

create function public.correct_store_stock_subgroup_cost(
  p_price_group_id bigint,
  p_subgroup_id text,
  p_new_unit_cost_cents bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_group public.store_price_groups;
  v_source_subgroup_id bigint;
  v_source_cost bigint;
  v_lot_units bigint;
  v_subgroup_units bigint;
  v_old_cost_total bigint;
  v_new_cost_total bigint;
  v_old_cost_exact numeric;
  v_new_cost_exact numeric;
  v_new_subgroup_id text;
  v_adjustment_id text := gen_random_uuid()::text;
begin
  if p_price_group_id is null or p_price_group_id <= 0 then
    raise exception using errcode = '22023', message = 'Price group id must be positive.';
  end if;
  if p_subgroup_id is null or p_subgroup_id !~ '^[1-9][0-9]*$' then
    raise exception using errcode = '22023', message = 'Stock subgroup id is invalid.';
  end if;
  if (p_subgroup_id)::numeric > 9223372036854775807::numeric then
    raise exception using errcode = '22003', message = 'Stock subgroup id exceeds the supported limit.';
  end if;
  if p_new_unit_cost_cents is not null and p_new_unit_cost_cents < 0 then
    raise exception using errcode = '22023', message = 'Unit cost cannot be negative.';
  end if;
  if p_new_unit_cost_cents > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Unit cost exceeds the supported limit.';
  end if;

  v_source_subgroup_id := p_subgroup_id::bigint;
  select * into v_group
  from public.store_price_groups as price_group
  where price_group.business_id = v_business_id
    and price_group.id = p_price_group_id
    and price_group.is_active
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Price group is unavailable.';
  end if;

  select lot.unit_cost_cents
  into v_source_cost
  from public.store_stock_lots as lot
  where lot.business_id = v_business_id
    and lot.price_group_id = p_price_group_id
    and lot.id = v_source_subgroup_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'Stock subgroup is unavailable.';
  end if;
  if v_source_cost is not distinct from p_new_unit_cost_cents then
    raise exception using errcode = '22023', message = 'The subgroup already has that purchase cost.';
  end if;

  select coalesce(sum(lot.remaining_units), 0)::bigint
  into v_lot_units
  from public.store_stock_lots as lot
  where lot.business_id = v_business_id and lot.price_group_id = p_price_group_id;
  if v_lot_units <> v_group.stock_units then
    raise exception using errcode = 'P0001', message = 'Stock lots do not match the available stock.';
  end if;

  select coalesce(sum(lot.remaining_units), 0)::bigint
  into v_subgroup_units
  from public.store_stock_lots as lot
  where lot.business_id = v_business_id
    and lot.price_group_id = p_price_group_id
    and lot.remaining_units > 0
    and lot.unit_cost_cents is not distinct from v_source_cost;
  if v_subgroup_units <= 0 then
    raise exception using errcode = 'P0001', message = 'The selected subgroup has no remaining stock.';
  end if;

  v_old_cost_total := null;
  if v_source_cost is not null then
    v_old_cost_exact := v_source_cost::numeric * v_subgroup_units::numeric;
    if v_old_cost_exact > 9007199254740991 then
      raise exception using errcode = '22003', message = 'Purchase cost exceeds the supported limit.';
    end if;
    v_old_cost_total := v_old_cost_exact::bigint;
  end if;
  v_new_cost_total := null;
  if p_new_unit_cost_cents is not null then
    v_new_cost_exact := p_new_unit_cost_cents::numeric * v_subgroup_units::numeric;
    if v_new_cost_exact > 9007199254740991 then
      raise exception using errcode = '22003', message = 'Purchase cost exceeds the supported limit.';
    end if;
    v_new_cost_total := v_new_cost_exact::bigint;
  end if;

  update public.store_stock_lots as lot
  set remaining_units = 0
  where lot.business_id = v_business_id
    and lot.price_group_id = p_price_group_id
    and lot.remaining_units > 0
    and lot.unit_cost_cents is not distinct from v_source_cost;

  insert into public.store_stock_lots (
    business_id, price_group_id, received_units, remaining_units, unit_cost_cents
  ) values (
    v_business_id, p_price_group_id, v_subgroup_units::integer, v_subgroup_units::integer, p_new_unit_cost_cents
  );

  select min(lot.id)::text
  into v_new_subgroup_id
  from public.store_stock_lots as lot
  where lot.business_id = v_business_id
    and lot.price_group_id = p_price_group_id
    and lot.remaining_units > 0
    and lot.unit_cost_cents is not distinct from p_new_unit_cost_cents;

  insert into public.store_stock_movements (
    business_id, price_group_id, movement_type, units_delta, note, cost_total_cents
  ) values (
    v_business_id, p_price_group_id, 'ajuste', -v_subgroup_units::integer,
    format('Corrección de coste %s: subgrupo %s.', v_adjustment_id, p_subgroup_id), v_old_cost_total
  );
  insert into public.store_stock_movements (
    business_id, price_group_id, movement_type, units_delta, note, cost_total_cents
  ) values (
    v_business_id, p_price_group_id, 'ajuste', v_subgroup_units::integer,
    format('Corrección de coste %s: nuevo subgrupo %s.', v_adjustment_id, v_new_subgroup_id), v_new_cost_total
  );

  return jsonb_build_object(
    'priceGroupId', p_price_group_id,
    'previousSubgroupId', p_subgroup_id,
    'subgroupId', v_new_subgroup_id,
    'unitsMoved', v_subgroup_units,
    'previousUnitCostCents', v_source_cost,
    'unitCostCents', p_new_unit_cost_cents
  );
end;
$$;

revoke all on function public.remove_store_stock_subgroup_units(bigint, text, integer, text) from public, anon;
revoke all on function public.correct_store_stock_subgroup_cost(bigint, text, bigint) from public, anon;
grant execute on function public.remove_store_stock_subgroup_units(bigint, text, integer, text) to authenticated;
grant execute on function public.correct_store_stock_subgroup_cost(bigint, text, bigint) to authenticated;
