alter table public.store_price_groups add column name text not null default '';
alter table public.store_price_groups drop constraint store_price_groups_business_id_category_id_price_cents_key;
alter table public.store_sales add column voided_at timestamptz;

create function public.create_store_product(
  p_category_id bigint, p_name text, p_price_cents bigint, p_units integer,
  p_unit_cost_cents bigint, p_photo_path text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_group public.store_price_groups;
  v_order integer;
begin
  if p_name is null or btrim(p_name) = '' or char_length(btrim(p_name)) > 60
     or p_price_cents is null or p_price_cents <= 0 or p_price_cents > 9007199254740991
     or p_units is null or p_units <= 0
     or p_unit_cost_cents is null or p_unit_cost_cents < 0
     or p_unit_cost_cents::numeric * p_units > 9007199254740991 then
    raise exception using errcode = '22023', message = 'Product details are invalid.';
  end if;
  if p_photo_path is null or p_photo_path not like v_business_id::text || '/%' then
    raise exception using errcode = '42501', message = 'Photo path is outside this business.';
  end if;
  perform 1 from public.store_categories
  where business_id = v_business_id and id = p_category_id and is_active for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Category is unavailable.';
  end if;
  if exists (
    select 1 from public.store_price_groups
    where business_id = v_business_id and category_id = p_category_id
      and lower(name) = lower(btrim(p_name))
  ) then
    raise exception using errcode = 'P0001', message = 'Product name already exists. Replenish the existing product.';
  end if;
  select coalesce(max(sort_order), -1) + 1 into v_order
  from public.store_price_groups where business_id = v_business_id and category_id = p_category_id;
  insert into public.store_price_groups
    (business_id, category_id, name, price_cents, stock_units, sort_order, photo_path)
  values (v_business_id, p_category_id, btrim(p_name), p_price_cents, p_units, v_order, p_photo_path)
  returning * into v_group;
  insert into public.store_stock_lots
    (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
  values (v_business_id, v_group.id, p_units, p_units, p_unit_cost_cents);
  insert into public.store_stock_movements
    (business_id, price_group_id, movement_type, units_delta, cost_total_cents)
  values (v_business_id, v_group.id, 'entrada', p_units, p_unit_cost_cents * p_units);
  return jsonb_build_object(
    'id', v_group.id, 'categoryId', v_group.category_id, 'name', v_group.name,
    'priceCents', v_group.price_cents, 'stockUnits', v_group.stock_units,
    'sortOrder', v_group.sort_order, 'photoPath', v_group.photo_path
  );
end;
$$;

create or replace function public.complete_store_sale(p_items jsonb, p_request_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid := private.current_business_id();
  v_receipt jsonb;
begin
  if v_business_id is null or not private.is_business_member(v_business_id) then
    raise exception using errcode = '42501', message = 'Business membership required.';
  end if;
  if p_request_id is not null and exists (
    select 1 from public.store_sales
    where business_id = v_business_id and request_id = p_request_id and voided_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'This sale was voided.';
  end if;
  v_receipt := private.complete_store_sale_impl(p_items, p_request_id);
  if private.has_business_role(v_business_id, 'owner') then return v_receipt; end if;
  return private.staff_safe_sale_receipt(v_receipt);
end;
$$;

create or replace function public.add_store_stock(
  p_category_id bigint, p_price_cents bigint, p_units integer,
  p_unit_cost_cents bigint default null, p_photo_path text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_business_id uuid := private.require_business_role('owner');
begin
  if (
    select count(*) from public.store_price_groups
    where business_id = v_business_id and category_id = p_category_id
      and price_cents = p_price_cents and is_active
  ) > 1 then
    raise exception using errcode = 'P0001', message = 'Choose a named product in the updated app.';
  end if;
  return private.add_store_stock_impl(
    p_category_id, p_price_cents, p_units, p_unit_cost_cents, p_photo_path
  );
end;
$$;

create function public.delete_store_product(p_group_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_group public.store_price_groups;
begin
  select * into v_group from public.store_price_groups
  where business_id = v_business_id and id = p_group_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'Product is unavailable.'; end if;
  if exists (select 1 from public.store_sale_items where business_id = v_business_id and price_group_id = p_group_id) then
    raise exception using errcode = 'P0001', message = 'A product with sales cannot be deleted.';
  end if;
  delete from public.store_stock_movements where business_id = v_business_id and price_group_id = p_group_id;
  delete from public.store_stock_lots where business_id = v_business_id and price_group_id = p_group_id;
  delete from public.store_price_groups where business_id = v_business_id and id = p_group_id;
  return v_group.photo_path;
end;
$$;

create function public.delete_store_category(p_category_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_business_id uuid := private.require_business_role('owner');
begin
  perform 1 from public.store_categories
  where business_id = v_business_id and id = p_category_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'Category is unavailable.'; end if;
  if exists (select 1 from public.store_price_groups where business_id = v_business_id and category_id = p_category_id) then
    raise exception using errcode = 'P0001', message = 'Delete its products first.';
  end if;
  delete from public.store_categories where business_id = v_business_id and id = p_category_id;
end;
$$;

create function public.void_store_sale(p_sale_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_sale public.store_sales;
  v_item record;
  v_base_cost bigint;
  v_extra_units integer;
begin
  select * into v_sale from public.store_sales
  where business_id = v_business_id and id = p_sale_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'Sale is unavailable.'; end if;
  if v_sale.voided_at is not null then
    raise exception using errcode = 'P0001', message = 'Sale is already voided.';
  end if;
  for v_item in
    select item.price_group_id, sum(item.units_sold)::integer as units
    from public.store_sale_items item
    where item.business_id = v_business_id and item.sale_id = p_sale_id
    group by item.price_group_id order by item.price_group_id
  loop
    perform 1 from public.store_price_groups
    where business_id = v_business_id and id = v_item.price_group_id for update;
  end loop;
  for v_item in
    select price_group_id, units_sold, cost_total_cents
    from public.store_sale_items
    where business_id = v_business_id and sale_id = p_sale_id order by id
  loop
    if v_item.cost_total_cents is null then
      insert into public.store_stock_lots
        (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
      values (v_business_id, v_item.price_group_id, v_item.units_sold, v_item.units_sold, null);
    else
      -- shortcut: old sales lack lot allocations; preserve line cost, track allocations if exact lot restoration becomes necessary.
      v_base_cost := v_item.cost_total_cents / v_item.units_sold;
      v_extra_units := (v_item.cost_total_cents % v_item.units_sold)::integer;
      if v_item.units_sold > v_extra_units then
        insert into public.store_stock_lots
          (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
        values (v_business_id, v_item.price_group_id,
          v_item.units_sold - v_extra_units, v_item.units_sold - v_extra_units, v_base_cost);
      end if;
      if v_extra_units > 0 then
        insert into public.store_stock_lots
          (business_id, price_group_id, received_units, remaining_units, unit_cost_cents)
        values (v_business_id, v_item.price_group_id, v_extra_units, v_extra_units, v_base_cost + 1);
      end if;
    end if;
  end loop;
  for v_item in
    select price_group_id, sum(units_sold)::integer as units
    from public.store_sale_items where business_id = v_business_id and sale_id = p_sale_id
    group by price_group_id
  loop
    update public.store_price_groups set stock_units = stock_units + v_item.units
    where business_id = v_business_id and id = v_item.price_group_id;
    insert into public.store_stock_movements
      (business_id, price_group_id, movement_type, units_delta, sale_id, note)
    values (v_business_id, v_item.price_group_id, 'ajuste', v_item.units, p_sale_id, 'Venta anulada');
  end loop;
  update public.store_sales set voided_at = now()
  where business_id = v_business_id and id = p_sale_id;
end;
$$;

create or replace function public.get_store_dashboard_summary(p_category_id bigint default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_business_id uuid := private.require_business_role('owner');
  v_summary jsonb;
begin
  select jsonb_build_object(
    'unitsSold', coalesce(sum(item.units_sold), 0),
    'revenueCents', coalesce(sum(item.total_cents), 0),
    'soldCostCents', case when count(item.id) <> count(item.cost_total_cents)
      then null else coalesce(sum(item.cost_total_cents), 0) end
  ) into v_summary
  from public.store_sale_items item
  join public.store_sales sale on sale.business_id = item.business_id and sale.id = item.sale_id
  join public.store_price_groups price_group
    on price_group.business_id = item.business_id and price_group.id = item.price_group_id
  where item.business_id = v_business_id and sale.voided_at is null
    and (p_category_id is null or price_group.category_id = p_category_id);
  return v_summary;
end;
$$;

create or replace function public.get_store_today_summary(p_start timestamptz, p_end timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
    'costTotalCents', case when count(item.id) <> count(item.cost_total_cents)
      then null else coalesce(sum(item.cost_total_cents), 0) end,
    'profitCents', case when count(item.id) <> count(item.cost_total_cents)
      then null else coalesce(sum(item.total_cents), 0) - coalesce(sum(item.cost_total_cents), 0) end
  ) into v_summary
  from public.store_sales sale
  join public.store_sale_items item on item.business_id = sale.business_id and item.sale_id = sale.id
  where sale.business_id = v_business_id and sale.voided_at is null
    and sale.sold_at >= p_start and sale.sold_at < p_end;
  return v_summary;
end;
$$;

revoke all on function public.create_store_product(bigint, text, bigint, integer, bigint, text) from public, anon;
revoke all on function public.delete_store_product(bigint) from public, anon;
revoke all on function public.delete_store_category(bigint) from public, anon;
revoke all on function public.void_store_sale(bigint) from public, anon;
grant execute on function public.create_store_product(bigint, text, bigint, integer, bigint, text) to authenticated;
grant execute on function public.delete_store_product(bigint) to authenticated;
grant execute on function public.delete_store_category(bigint) to authenticated;
grant execute on function public.void_store_sale(bigint) to authenticated;
