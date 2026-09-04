/* 0016: reconcile analytics/count RPCs with the canonical asset assignment schema. */

create or replace function public.get_company_counts(p_company_id uuid)
returns jsonb language plpgsql security definer volatile set search_path = public, pg_catalog as $$
declare result jsonb;
begin
  if not exists (select 1 from public.company_memberships m where m.company_id=p_company_id and m.user_id=auth.uid() and m.is_active=true) then raise exception 'Not authorized for company'; end if;
  select jsonb_build_object(
    'users_total',(select count(*) from public.company_memberships m where m.company_id=p_company_id and m.is_active=true),
    'users_unique',(select count(distinct m.user_id) from public.company_memberships m where m.company_id=p_company_id and m.is_active=true),
    'departments_total',(select count(*) from public.departments d where d.company_id=p_company_id),
    'teams_total',(select count(*) from public.teams t where t.company_id=p_company_id),
    'ticket_categories_total',(select count(*) from public.ticket_categories c where c.company_id=p_company_id),
    'tickets_total',(select count(*) from public.tickets t where t.company_id=p_company_id),
    'tickets_open',(select count(*) from public.tickets t where t.company_id=p_company_id and t.status='open'),
    'tickets_in_progress',(select count(*) from public.tickets t where t.company_id=p_company_id and t.status='in_progress'),
    'tickets_pending',(select count(*) from public.tickets t where t.company_id=p_company_id and t.status='pending'),
    'tickets_resolved',(select count(*) from public.tickets t where t.company_id=p_company_id and t.status='resolved'),
    'tickets_closed',(select count(*) from public.tickets t where t.company_id=p_company_id and t.status='closed'),
    'tickets_unresolved',(select count(*) from public.tickets t where t.company_id=p_company_id and t.status in ('open','in_progress','pending')),
    'tickets_overdue',(select count(*) from public.tickets t where t.company_id=p_company_id and t.due_at<now() and t.status not in ('resolved','closed')),
    'assets_total',(select count(*) from public.assets a where a.company_id=p_company_id),
    'asset_assignments_active',(select count(*) from public.asset_assignments aa join public.assets a on a.id=aa.asset_id where a.company_id=p_company_id and aa.returned_at is null),
    'ticket_assignments_active',(select count(*) from public.ticket_assignments ta join public.tickets t on t.id=ta.ticket_id where t.company_id=p_company_id and ta.unassigned_at is null),
    'ticket_comments_total',(select count(*) from public.ticket_comments tc join public.tickets t on t.id=tc.ticket_id where t.company_id=p_company_id),
    'ticket_attachments_total',(select count(*) from public.ticket_attachments ta join public.tickets t on t.id=ta.ticket_id where t.company_id=p_company_id),
    'workspace_folders_total',(select count(*) from public.workspace_folders f where f.company_id=p_company_id),
    'workspace_files_total',(select count(*) from public.workspace_files f where f.company_id=p_company_id),
    'notifications_unread',(select count(*) from public.notifications n where n.company_id=p_company_id and n.recipient_id=auth.uid() and n.read_at is null),
    'attendance_today',(select count(*) from public.attendance a where a.company_id=p_company_id and a.attendance_date=current_date),
    'qr_codes_active',(select count(*) from public.qr_codes q where q.company_id=p_company_id and q.status='active'),
    'qr_scans_today',(select count(*) from public.qr_scan_logs s join public.qr_codes q on q.id=s.qr_code_id where q.company_id=p_company_id and s.scanned_at>=current_date and s.scanned_at<current_date+interval '1 day'),
    'video_calls_total',(select count(*) from public.video_calls c where c.company_id=p_company_id),
    'video_calls_active',(select count(*) from public.video_calls c where c.company_id=p_company_id and c.status='active'),
    'subscriptions_total',(select count(*) from public.subscriptions s where s.company_id=p_company_id),
    'payments_total',(select count(*) from public.payments p where p.company_id=p_company_id),
    'audit_logs_total',(select count(*) from public.audit_logs l where l.company_id=p_company_id)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_company_analytics(p_company_id uuid)
returns jsonb language plpgsql security definer stable set search_path = public, pg_catalog as $$
declare result jsonb;
begin
  if not exists (select 1 from public.company_memberships m where m.company_id=p_company_id and m.user_id=auth.uid() and m.is_active=true) then raise exception 'Not authorized for company'; end if;
  select jsonb_build_object(
    'avg_resolution_hours',coalesce((select round((extract(epoch from avg(t.resolved_at-t.created_at))/3600.0)::numeric,2) from public.tickets t where t.company_id=p_company_id and t.resolved_at is not null),0),
    'employees',coalesce((select jsonb_agg(row_to_json(x) order by x.full_name) from (select p.id as user_id,coalesce(nullif(trim(p.full_name),''),'Unnamed user') as full_name,(select count(*) from public.tickets t where t.company_id=p_company_id and t.created_by=p.id) as tickets_created,(select count(*) from public.tickets t where t.company_id=p_company_id and t.created_by=p.id and t.status in ('resolved','closed')) as tickets_resolved,coalesce((select round((extract(epoch from avg(t.resolved_at-t.created_at))/3600.0)::numeric,2) from public.tickets t where t.company_id=p_company_id and t.created_by=p.id and t.resolved_at is not null),0) as avg_resolution_hours,(select count(*) from public.asset_assignments aa join public.assets a on a.id=aa.asset_id where a.company_id=p_company_id and aa.assigned_to=p.id and aa.returned_at is null) as assets_assigned from public.profiles p join public.company_memberships m on m.user_id=p.id and m.company_id=p_company_id and m.is_active=true and m.role in ('admin','hr','manager','employee','contractor')) x),'[]'::json),
    'ticket_trend',coalesce((select jsonb_agg(row_to_json(x) order by x.date) from (select d::date as date,(select count(*) from public.tickets t where t.company_id=p_company_id and t.created_at>=d and t.created_at<d+interval '1 day') as created,(select count(*) from public.tickets t where t.company_id=p_company_id and t.resolved_at>=d and t.resolved_at<d+interval '1 day') as resolved from generate_series(current_date-interval '29 days',current_date,interval '1 day') d) x),'[]'::json)
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_company_counts(uuid) from public;
revoke execute on function public.get_company_counts(uuid) from anon;
grant execute on function public.get_company_counts(uuid) to authenticated;
revoke all on function public.get_company_analytics(uuid) from public;
revoke execute on function public.get_company_analytics(uuid) from anon;
grant execute on function public.get_company_analytics(uuid) to authenticated;
