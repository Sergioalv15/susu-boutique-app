create function public.update_store_category(
  p_category_id bigint,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_name text := btrim(coalesce(p_name, ''));
  v_category public.store_categories;
begin
  if p_category_id is null or p_category_id <= 0 then
    raise exception using errcode = '22023', message = 'Category id must be positive.';
  end if;
  if v_name = '' or char_length(v_name) > 40 then
    raise exception using errcode = '22023', message = 'Category name must contain between 1 and 40 characters.';
  end if;

  update public.store_categories
  set name = v_name
  where business_id = v_business_id
    and id = p_category_id
    and is_active
  returning * into v_category;

  if not found then
    raise exception using errcode = 'P0001', message = 'Category is unavailable.';
  end if;

  return jsonb_build_object('id', v_category.id, 'name', v_category.name, 'sortOrder', v_category.sort_order);
end;
$$;

create function private.archive_store_price_group(
  p_business_id uuid,
  p_price_group_id bigint,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.store_price_groups;
  v_lot_units bigint;
  v_bucket record;
  v_cost_exact numeric;
  v_cost_total bigint;
  v_adjusted_units bigint := 0;
  v_has_history boolean;
  v_status text;
begin
  select * into v_group
  from public.store_price_groups
  where business_id = p_business_id and id = p_price_group_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Price group is unavailable.';
  end if;

  select coalesce(sum(lot.remaining_units), 0)::bigint
  into v_lot_units
  from public.store_stock_lots as lot
  where lot.business_id = p_business_id and lot.price_group_id = p_price_group_id;
  if v_lot_units <> v_group.stock_units then
    raise exception using errcode = 'P0001', message = 'Stock lots do not match the available stock.';
  end if;

  for v_bucket in
    select lot.unit_cost_cents, sum(lot.remaining_units)::bigint as units
    from public.store_stock_lots as lot
    where lot.business_id = p_business_id
      and lot.price_group_id = p_price_group_id
      and lot.remaining_units > 0
    group by lot.unit_cost_cents
    order by min(lot.id)
  loop
    v_cost_total := null;
    if v_bucket.unit_cost_cents is not null then
      v_cost_exact := v_bucket.unit_cost_cents::numeric * v_bucket.units::numeric;
      if v_cost_exact > 9007199254740991 then
        raise exception using errcode = '22003', message = 'Stock adjustment cost exceeds the supported limit.';
      end if;
      v_cost_total := v_cost_exact::bigint;
    end if;

    update public.store_stock_lots as lot
    set remaining_units = 0
    where lot.business_id = p_business_id
      and lot.price_group_id = p_price_group_id
      and lot.remaining_units > 0
      and lot.unit_cost_cents is not distinct from v_bucket.unit_cost_cents;

    insert into public.store_stock_movements (
      business_id, price_group_id, movement_type, units_delta, note, cost_total_cents
    ) values (
      p_business_id, p_price_group_id, 'ajuste', -v_bucket.units::integer,
      btrim(coalesce(p_note, 'Retirada de stock al archivar el grupo.')),
      v_cost_total
    );
    v_adjusted_units := v_adjusted_units + v_bucket.units;
  end loop;

  update public.store_price_groups
  set stock_units = 0,
      is_active = false
  where business_id = p_business_id and id = p_price_group_id;

  select exists (
    select 1 from public.store_sale_items as item
    where item.business_id = p_business_id and item.price_group_id = p_price_group_id
  ) or exists (
    select 1 from public.store_stock_movements as movement
    where movement.business_id = p_business_id and movement.price_group_id = p_price_group_id
  ) or exists (
    select 1 from public.store_stock_lots as lot
    where lot.business_id = p_business_id and lot.price_group_id = p_price_group_id
  ) or v_group.photo_path <> ''
  into v_has_history;

  if not v_has_history then
    delete from public.store_price_groups
    where business_id = p_business_id and id = p_price_group_id;
    v_status := 'deleted';
  else
    v_status := 'archived';
  end if;

  return jsonb_build_object(
    'id', p_price_group_id,
    'status', v_status,
    'adjustedUnits', v_adjusted_units
  );
end;
$$;

revoke all on function private.archive_store_price_group(uuid, bigint, text) from public, anon, authenticated;

create function public.delete_store_price_group(p_price_group_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.require_business_role('owner');
begin
  if p_price_group_id is null or p_price_group_id <= 0 then
    raise exception using errcode = '22023', message = 'Price group id must be positive.';
  end if;
  return private.archive_store_price_group(v_business_id, p_price_group_id, 'Grupo eliminado por el propietario.');
end;
$$;

create function public.delete_store_category(p_category_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_category public.store_categories;
  v_group record;
  v_result jsonb;
  v_adjusted_units bigint := 0;
  v_status text;
begin
  if p_category_id is null or p_category_id <= 0 then
    raise exception using errcode = '22023', message = 'Category id must be positive.';
  end if;

  select * into v_category
  from public.store_categories
  where business_id = v_business_id and id = p_category_id and is_active
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Category is unavailable.';
  end if;

  for v_group in
    select price_group.id
    from public.store_price_groups as price_group
    where price_group.business_id = v_business_id
      and price_group.category_id = p_category_id
      and price_group.is_active
    order by price_group.id
  loop
    v_result := private.archive_store_price_group(
      v_business_id,
      v_group.id,
      format('Ajuste de salida al archivar la categoría %s.', v_category.name)
    );
    v_adjusted_units := v_adjusted_units + coalesce((v_result ->> 'adjustedUnits')::bigint, 0);
  end loop;

  if exists (
    select 1 from public.store_price_groups as price_group
    where price_group.business_id = v_business_id and price_group.category_id = p_category_id
  ) then
    update public.store_categories
    set is_active = false
    where business_id = v_business_id and id = p_category_id;
    v_status := 'archived';
  else
    delete from public.store_categories
    where business_id = v_business_id and id = p_category_id;
    v_status := 'deleted';
  end if;

  return jsonb_build_object('id', p_category_id, 'status', v_status, 'adjustedUnits', v_adjusted_units);
end;
$$;

create function public.update_store_price_group(
  p_price_group_id bigint,
  p_price_cents bigint,
  p_sort_order integer,
  p_photo_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_category_id bigint;
  v_source public.store_price_groups;
  v_target public.store_price_groups;
  v_target_id bigint;
  v_source_units bigint;
  v_lot_units bigint;
  v_bucket record;
  v_cost_exact numeric;
  v_cost_total bigint;
  v_has_history boolean;
  v_transfer_id uuid := gen_random_uuid();
  v_status text;
begin
  if p_price_group_id is null or p_price_group_id <= 0 then
    raise exception using errcode = '22023', message = 'Price group id must be positive.';
  end if;
  if p_price_cents is null or p_price_cents <= 0 then
    raise exception using errcode = '22023', message = 'Sale price must be greater than zero.';
  end if;
  if p_price_cents > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Sale price exceeds the supported limit.';
  end if;
  if p_sort_order is not null and p_sort_order < 0 then
    raise exception using errcode = '22023', message = 'Sort order cannot be negative.';
  end if;
  if p_photo_path is not null and p_photo_path <> '' and split_part(p_photo_path, '/', 1) <> v_business_id::text then
    raise exception using errcode = '42501', message = 'Photo path is outside this business.';
  end if;

  select price_group.category_id into v_category_id
  from public.store_price_groups as price_group
  where price_group.business_id = v_business_id
    and price_group.id = p_price_group_id
    and price_group.is_active;
  if not found then
    raise exception using errcode = 'P0001', message = 'Price group is unavailable.';
  end if;

  perform 1 from public.store_categories as category
  where category.business_id = v_business_id and category.id = v_category_id and category.is_active
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Category is unavailable.';
  end if;

  select * into v_source
  from public.store_price_groups as price_group
  where price_group.business_id = v_business_id and price_group.id = p_price_group_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Price group is unavailable.';
  end if;

  if p_price_cents = v_source.price_cents then
    update public.store_price_groups
    set sort_order = coalesce(p_sort_order, sort_order),
        photo_path = coalesce(p_photo_path, photo_path)
    where business_id = v_business_id and id = p_price_group_id
    returning * into v_source;
    return jsonb_build_object(
      'id', v_source.id, 'previousGroupId', v_source.id,
      'categoryId', v_source.category_id, 'priceCents', v_source.price_cents,
      'stockUnits', v_source.stock_units, 'sortOrder', v_source.sort_order,
      'photoPath', v_source.photo_path, 'status', 'updated'
    );
  end if;

  select price_group.id into v_target_id
  from public.store_price_groups as price_group
  where price_group.business_id = v_business_id
    and price_group.category_id = v_category_id
    and price_group.price_cents = p_price_cents
    and price_group.id <> p_price_group_id;

  select exists (
    select 1 from public.store_sale_items as item
    where item.business_id = v_business_id and item.price_group_id = p_price_group_id
  ) or exists (
    select 1 from public.store_stock_movements as movement
    where movement.business_id = v_business_id and movement.price_group_id = p_price_group_id
  ) or exists (
    select 1 from public.store_stock_lots as lot
    where lot.business_id = v_business_id and lot.price_group_id = p_price_group_id
  )
  into v_has_history;

  if not v_has_history and v_target_id is null then
    update public.store_price_groups
    set price_cents = p_price_cents,
        sort_order = coalesce(p_sort_order, sort_order),
        photo_path = coalesce(p_photo_path, photo_path)
    where business_id = v_business_id and id = p_price_group_id
    returning * into v_source;
    v_status := 'updated';
    v_target := v_source;
  else
    if v_target_id is null then
      insert into public.store_price_groups (
        business_id, category_id, price_cents, stock_units, sort_order, is_active, photo_path
      ) values (
        v_business_id, v_category_id, p_price_cents, 0,
        coalesce(p_sort_order, v_source.sort_order), true,
        coalesce(p_photo_path, v_source.photo_path)
      ) returning * into v_target;
      v_target_id := v_target.id;
    else
      select * into v_target
      from public.store_price_groups as price_group
      where price_group.business_id = v_business_id and price_group.id = v_target_id
      for update;
      update public.store_price_groups
      set is_active = true,
          sort_order = coalesce(p_sort_order, sort_order),
          photo_path = case
            when p_photo_path is not null then p_photo_path
            when photo_path = '' then v_source.photo_path
            else photo_path
          end
      where business_id = v_business_id and id = v_target_id
      returning * into v_target;
    end if;

    select coalesce(sum(lot.remaining_units), 0)::bigint
    into v_lot_units
    from public.store_stock_lots as lot
    where lot.business_id = v_business_id and lot.price_group_id = p_price_group_id;
    if v_lot_units <> v_source.stock_units then
      raise exception using errcode = 'P0001', message = 'Stock lots do not match the available stock.';
    end if;
    v_source_units := v_source.stock_units;
    if v_target.stock_units::bigint + v_source_units > 2147483647 then
      raise exception using errcode = '22003', message = 'Transferred stock exceeds the supported limit.';
    end if;

    for v_bucket in
      select lot.unit_cost_cents, sum(lot.remaining_units)::bigint as units
      from public.store_stock_lots as lot
      where lot.business_id = v_business_id
        and lot.price_group_id = p_price_group_id
        and lot.remaining_units > 0
      group by lot.unit_cost_cents
      order by min(lot.id)
    loop
      v_cost_total := null;
      if v_bucket.unit_cost_cents is not null then
        v_cost_exact := v_bucket.unit_cost_cents::numeric * v_bucket.units::numeric;
        if v_cost_exact > 9007199254740991 then
          raise exception using errcode = '22003', message = 'Transferred stock cost exceeds the supported limit.';
        end if;
        v_cost_total := v_cost_exact::bigint;
      end if;

      update public.store_stock_lots as lot
      set remaining_units = 0
      where lot.business_id = v_business_id
        and lot.price_group_id = p_price_group_id
        and lot.remaining_units > 0
        and lot.unit_cost_cents is not distinct from v_bucket.unit_cost_cents;

      insert into public.store_stock_lots (
        business_id, price_group_id, received_units, remaining_units, unit_cost_cents
      ) values (
        v_business_id, v_target_id, v_bucket.units::integer, v_bucket.units::integer, v_bucket.unit_cost_cents
      );
      insert into public.store_stock_movements (
        business_id, price_group_id, movement_type, units_delta, note, cost_total_cents
      ) values (
        v_business_id, p_price_group_id, 'ajuste', -v_bucket.units::integer,
        format('Transferencia %s al grupo %s.', v_transfer_id, v_target_id), v_cost_total
      );
      insert into public.store_stock_movements (
        business_id, price_group_id, movement_type, units_delta, note, cost_total_cents
      ) values (
        v_business_id, v_target_id, 'ajuste', v_bucket.units::integer,
        format('Transferencia %s desde el grupo %s.', v_transfer_id, p_price_group_id), v_cost_total
      );
    end loop;

    update public.store_price_groups
    set stock_units = 0, is_active = false
    where business_id = v_business_id and id = p_price_group_id
    returning * into v_source;
    update public.store_price_groups
    set stock_units = stock_units + v_source_units::integer,
        is_active = true
    where business_id = v_business_id and id = v_target_id
    returning * into v_target;
    v_status := 'versioned';
  end if;

  return jsonb_build_object(
    'id', v_target.id, 'previousGroupId', p_price_group_id,
    'categoryId', v_target.category_id, 'priceCents', v_target.price_cents,
    'stockUnits', v_target.stock_units, 'sortOrder', v_target.sort_order,
    'photoPath', v_target.photo_path, 'status', v_status
  );
end;
$$;

revoke all on function public.update_store_category(bigint, text) from public, anon;
revoke all on function public.delete_store_price_group(bigint) from public, anon;
revoke all on function public.delete_store_category(bigint) from public, anon;
revoke all on function public.update_store_price_group(bigint, bigint, integer, text) from public, anon;
grant execute on function public.update_store_category(bigint, text) to authenticated;
grant execute on function public.delete_store_price_group(bigint) to authenticated;
grant execute on function public.delete_store_category(bigint) to authenticated;
grant execute on function public.update_store_price_group(bigint, bigint, integer, text) to authenticated;
