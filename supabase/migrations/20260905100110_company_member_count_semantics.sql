-- Dashboard/user-management counts must distinguish total, active and inactive
-- memberships. Previously users_total counted only active memberships.
create or replace function public.get_company_counts(p_company_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select private.get_company_counts(p_company_id)
    || jsonb_build_object(
      'users_total', (select count(*) from public.company_memberships m where m.company_id=p_company_id),
      'users_active', (select count(*) from public.company_memberships m where m.company_id=p_company_id and m.is_active=true),
      'users_inactive', (select count(*) from public.company_memberships m where m.company_id=p_company_id and m.is_active=false)
    );
$$;
