create function public.add_business_member_by_email(
  p_email text,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_user_id uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  perform private.require_business_role('owner');
  v_business_id := private.current_business_id();

  if v_email = '' then
    raise exception using errcode = '22023', message = 'Email is required.';
  end if;

  if p_role is null or p_role not in ('owner', 'staff') then
    raise exception using errcode = '22023', message = 'Role must be owner or staff.';
  end if;

  select auth_user.id
  into v_user_id
  from auth.users as auth_user
  where lower(btrim(auth_user.email)) = v_email;

  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'No Auth account found for this email.';
  end if;

  if exists (
    select 1
    from public.business_members as member
    where member.user_id = v_user_id
  ) then
    raise exception using errcode = '23505', message = 'Account already has business access.';
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, v_user_id, p_role);
end;
$$;

revoke all on function public.add_business_member_by_email(text, text) from public, anon;
grant execute on function public.add_business_member_by_email(text, text) to authenticated;
