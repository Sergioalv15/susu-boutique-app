create function public.remove_store_stock(
  p_group_id bigint, p_units integer, p_note text default ''
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_group public.store_price_groups;
  v_lot record;
  v_pending integer;
  v_taken integer;
  v_cost bigint := 0;
  v_unknown_cost boolean := false;
begin
  if p_units is null or p_units <= 0 then
    raise exception using errcode = '22023', message = 'Stock removal must be positive.';
  end if;

  select * into v_group from public.store_price_groups
  where business_id = v_business_id and id = p_group_id and is_active for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Product is unavailable.';
  end if;
  if v_group.stock_units < p_units then
    raise exception using errcode = 'P0001',
      message = format('Solo hay %s unidades disponibles.', v_group.stock_units);
  end if;

  v_pending := p_units;
  for v_lot in
    select id, remaining_units, unit_cost_cents
    from public.store_stock_lots
    where business_id = v_business_id and price_group_id = p_group_id and remaining_units > 0
    order by id
    for update
  loop
    v_taken := least(v_lot.remaining_units, v_pending);
    if v_lot.unit_cost_cents is null then
      v_unknown_cost := true;
    else
      v_cost := v_cost + v_lot.unit_cost_cents::bigint * v_taken::bigint;
    end if;
    update public.store_stock_lots
    set remaining_units = remaining_units - v_taken
    where business_id = v_business_id and id = v_lot.id;
    v_pending := v_pending - v_taken;
    exit when v_pending = 0;
  end loop;
  if v_pending <> 0 then
    raise exception using errcode = 'P0001', message = 'El detalle de lotes no coincide con el stock.';
  end if;

  update public.store_price_groups
  set stock_units = stock_units - p_units
  where business_id = v_business_id and id = p_group_id
  returning * into v_group;
  insert into public.store_stock_movements
    (business_id, price_group_id, movement_type, units_delta, note, cost_total_cents)
  values (v_business_id, p_group_id, 'ajuste', -p_units, btrim(coalesce(p_note, '')),
    case when v_unknown_cost then null else v_cost end);

  return jsonb_build_object(
    'id', v_group.id, 'categoryId', v_group.category_id, 'name', v_group.name,
    'priceCents', v_group.price_cents, 'stockUnits', v_group.stock_units,
    'sortOrder', v_group.sort_order, 'photoPath', v_group.photo_path
  );
end;
$$;

create function public.update_store_product(
  p_group_id bigint, p_name text, p_price_cents bigint
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_group public.store_price_groups;
  v_name text := btrim(p_name);
begin
  if v_name is null or v_name = '' or char_length(v_name) > 60
     or p_price_cents is null or p_price_cents <= 0 or p_price_cents > 9007199254740991 then
    raise exception using errcode = '22023', message = 'Product details are invalid.';
  end if;

  select * into v_group from public.store_price_groups
  where business_id = v_business_id and id = p_group_id and is_active for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Product is unavailable.';
  end if;
  if exists (
    select 1 from public.store_price_groups
    where business_id = v_business_id and category_id = v_group.category_id
      and id <> p_group_id and lower(name) = lower(v_name)
  ) then
    raise exception using errcode = 'P0001', message = 'Product name already exists.';
  end if;

  update public.store_price_groups
  set name = v_name, price_cents = p_price_cents
  where business_id = v_business_id and id = p_group_id
  returning * into v_group;

  return jsonb_build_object(
    'id', v_group.id, 'categoryId', v_group.category_id, 'name', v_group.name,
    'priceCents', v_group.price_cents, 'stockUnits', v_group.stock_units,
    'sortOrder', v_group.sort_order, 'photoPath', v_group.photo_path
  );
end;
$$;

create function public.update_store_product_photo(
  p_group_id bigint, p_photo_path text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_group public.store_price_groups;
  v_previous_path text;
begin
  if p_photo_path is null or p_photo_path not like v_business_id::text || '/%' then
    raise exception using errcode = '42501', message = 'Photo path is outside this business.';
  end if;

  select * into v_group from public.store_price_groups
  where business_id = v_business_id and id = p_group_id and is_active for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Product is unavailable.';
  end if;
  v_previous_path := v_group.photo_path;

  update public.store_price_groups
  set photo_path = p_photo_path
  where business_id = v_business_id and id = p_group_id
  returning * into v_group;

  return jsonb_build_object(
    'id', v_group.id, 'categoryId', v_group.category_id, 'name', v_group.name,
    'priceCents', v_group.price_cents, 'stockUnits', v_group.stock_units,
    'sortOrder', v_group.sort_order, 'photoPath', v_group.photo_path,
    'previousPhotoPath', v_previous_path
  );
end;
$$;

revoke all on function public.remove_store_stock(bigint, integer, text) from public, anon;
revoke all on function public.update_store_product(bigint, text, bigint) from public, anon;
revoke all on function public.update_store_product_photo(bigint, text) from public, anon;
grant execute on function public.remove_store_stock(bigint, integer, text) to authenticated;
grant execute on function public.update_store_product(bigint, text, bigint) to authenticated;
grant execute on function public.update_store_product_photo(bigint, text) to authenticated;

-- rollback: drop function public.remove_store_stock(bigint, integer, text);
--           drop function public.update_store_product(bigint, text, bigint);
--           drop function public.update_store_product_photo(bigint, text);
