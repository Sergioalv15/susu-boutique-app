-- Recreate an archived category by reactivating its history-bearing row.
create or replace function private.create_store_category_impl(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_name text := btrim(p_name);
  v_sort_order integer;
  v_category public.store_categories;
begin
  if v_business_id is null then
    raise exception using errcode = '42501', message = 'Business membership required.';
  end if;
  if v_name is null or v_name = '' or char_length(v_name) > 40 then
    raise exception using errcode = '22023', message = 'Category name is invalid.';
  end if;

  perform 1 from public.businesses where id = v_business_id for update;

  select * into v_category
  from public.store_categories
  where business_id = v_business_id and lower(name) = lower(v_name)
  for update;

  if found then
    if v_category.is_active then
      raise exception using errcode = '23505', message = 'Category already exists.';
    end if;
    update public.store_categories
    set is_active = true
    where business_id = v_business_id and id = v_category.id
    returning * into v_category;
  else
    select coalesce(max(sort_order), -1) + 1 into v_sort_order
    from public.store_categories
    where business_id = v_business_id;

    insert into public.store_categories (business_id, name, sort_order)
    values (v_business_id, v_name, v_sort_order)
    returning * into v_category;
  end if;

  return jsonb_build_object(
    'id', v_category.id,
    'name', v_category.name,
    'sortOrder', v_category.sort_order
  );
end;
$$;
