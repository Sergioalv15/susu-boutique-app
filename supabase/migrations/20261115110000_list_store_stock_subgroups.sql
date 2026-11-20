create function public.list_store_stock_subgroups(p_price_group_id bigint)
returns table (
  subgroup_id text,
  remaining_units bigint,
  unit_cost_cents bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_is_owner boolean;
begin
  if v_business_id is null then
    raise exception using errcode = '42501', message = 'Business membership required.';
  end if;

  if p_price_group_id is null or p_price_group_id <= 0 then
    raise exception using errcode = '22023', message = 'Price group id must be positive.';
  end if;

  if not exists (
    select 1
    from public.store_price_groups as price_group
    join public.store_categories as category
      on category.business_id = price_group.business_id
      and category.id = price_group.category_id
    where price_group.business_id = v_business_id
      and price_group.id = p_price_group_id
      and price_group.is_active
      and category.is_active
  ) then
    raise exception using errcode = 'P0001', message = 'Price group is unavailable.';
  end if;

  v_is_owner := private.has_business_role(v_business_id, 'owner');

  return query
  select min(lot.id)::text,
         sum(lot.remaining_units)::bigint,
         case when v_is_owner then lot.unit_cost_cents else null::bigint end
  from public.store_stock_lots as lot
  where lot.business_id = v_business_id
    and lot.price_group_id = p_price_group_id
    and lot.remaining_units > 0
  group by lot.unit_cost_cents
  order by min(lot.id);
end;
$$;

revoke all on function public.list_store_stock_subgroups(bigint) from public, anon;
grant execute on function public.list_store_stock_subgroups(bigint) to authenticated;
