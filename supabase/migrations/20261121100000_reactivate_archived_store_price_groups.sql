create or replace function private.add_store_stock_impl(
  p_category_id bigint,
  p_price_cents bigint,
  p_units integer,
  p_unit_cost_cents bigint default null,
  p_photo_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_group public.store_price_groups;
  v_sort_order integer;
  v_purchase_total bigint;
  v_purchase_total_exact numeric;
begin
  if v_business_id is null then
    raise exception using errcode = '42501', message = 'Business membership required.';
  end if;
  if p_units is null or p_units <= 0 or p_price_cents is null or p_price_cents <= 0 then
    raise exception using errcode = '22023', message = 'Units and price must be greater than zero.';
  end if;
  if p_price_cents > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Price exceeds the supported limit.';
  end if;
  if p_unit_cost_cents is not null and p_unit_cost_cents < 0 then
    raise exception using errcode = '22023', message = 'Unit cost cannot be negative.';
  end if;
  if p_unit_cost_cents > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Unit cost exceeds the supported limit.';
  end if;
  if p_photo_path is not null and p_photo_path <> '' and split_part(p_photo_path, '/', 1) <> v_business_id::text then
    raise exception using errcode = '42501', message = 'Photo path is outside this business.';
  end if;

  v_purchase_total_exact := case
    when p_unit_cost_cents is null then null
    else p_unit_cost_cents::numeric * p_units::numeric
  end;
  if v_purchase_total_exact > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Purchase total exceeds the supported limit.';
  end if;
  v_purchase_total := v_purchase_total_exact::bigint;

  perform 1 from public.store_categories
  where business_id = v_business_id and id = p_category_id and is_active
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Category is unavailable.';
  end if;

  select * into v_group
  from public.store_price_groups
  where business_id = v_business_id and category_id = p_category_id and price_cents = p_price_cents
  for update;

  if found then
    if v_group.stock_units::bigint + p_units > 2147483647 then
      raise exception using errcode = '22003', message = 'Stock exceeds the supported limit.';
    end if;
    update public.store_price_groups
    set is_active = true,
        stock_units = stock_units + p_units,
        photo_path = coalesce(nullif(p_photo_path, ''), photo_path)
    where business_id = v_business_id and id = v_group.id
    returning * into v_group;
  else
    select coalesce(max(sort_order), -1) + 1 into v_sort_order
    from public.store_price_groups
    where business_id = v_business_id and category_id = p_category_id;
    insert into public.store_price_groups (
      business_id, category_id, price_cents, stock_units, sort_order, photo_path
    ) values (
      v_business_id, p_category_id, p_price_cents, p_units, v_sort_order, coalesce(p_photo_path, '')
    ) returning * into v_group;
  end if;

  insert into public.store_stock_lots (
    business_id, price_group_id, received_units, remaining_units, unit_cost_cents
  ) values (
    v_business_id, v_group.id, p_units, p_units, p_unit_cost_cents
  );
  insert into public.store_stock_movements (
    business_id, price_group_id, movement_type, units_delta, cost_total_cents
  ) values (
    v_business_id, v_group.id, 'entrada', p_units, v_purchase_total
  );

  return jsonb_build_object(
    'id', v_group.id, 'categoryId', v_group.category_id, 'priceCents', v_group.price_cents,
    'stockUnits', v_group.stock_units, 'sortOrder', v_group.sort_order, 'photoPath', v_group.photo_path
  );
end;
$$;
