/* Desk-Support canonical analytics: exact server-side aggregates. */
create or replace function public.get_company_analytics(p_company_id uuid)
returns jsonb language plpgsql security definer stable set search_path = public, pg_catalog as $$
declare result jsonb;
begin
  if not exists (select 1 from public.company_memberships m where m.company_id=p_company_id and m.user_id=auth.uid() and m.is_active=true) then raise exception 'Not authorized for company'; end if;
  select jsonb_build_object(
    'avg_resolution_hours', coalesce((select round((extract(epoch from avg(t.resolved_at-t.created_at))/3600.0)::numeric,2) from public.tickets t where t.company_id=p_company_id and t.resolved_at is not null),0),
    'employees', coalesce((select jsonb_agg(row_to_json(x) order by x.full_name) from (select p.id as user_id, coalesce(nullif(trim(p.full_name),''),'Unnamed user') as full_name, (select count(*) from public.tickets t where t.company_id=p_company_id and t.created_by=p.id) as tickets_created, (select count(*) from public.tickets t where t.company_id=p_company_id and t.created_by=p.id and t.status in ('resolved','closed')) as tickets_resolved, coalesce((select round((extract(epoch from avg(t.resolved_at-t.created_at))/3600.0)::numeric,2) from public.tickets t where t.company_id=p_company_id and t.created_by=p.id and t.resolved_at is not null),0) as avg_resolution_hours, (select count(*) from public.asset_assignments aa join public.assets a on a.id=aa.asset_id where a.company_id=p_company_id and aa.user_id=p.id and aa.unassigned_at is null) as assets_assigned from public.profiles p join public.company_memberships m on m.user_id=p.id and m.company_id=p_company_id and m.is_active=true and m.role in ('admin','hr','manager','employee','contractor')) x),'[]'::json),
    'ticket_trend', coalesce((select jsonb_agg(row_to_json(x) order by x.date) from (select d::date as date, (select count(*) from public.tickets t where t.company_id=p_company_id and t.created_at>=d and t.created_at<d+interval '1 day') as created, (select count(*) from public.tickets t where t.company_id=p_company_id and t.resolved_at>=d and t.resolved_at<d+interval '1 day') as resolved from generate_series(current_date-interval '29 days',current_date,interval '1 day') d) x),'[]'::json)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_company_analytics(uuid) from public;
revoke execute on function public.get_company_analytics(uuid) from anon;
grant execute on function public.get_company_analytics(uuid) to authenticated;
comment on function public.get_company_analytics(uuid) is 'Exact server-side analytics for an actively authorized company.';
