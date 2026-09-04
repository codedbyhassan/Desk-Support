/*
  0012: exact source-of-truth counts + large dataset access contract.

  Design:
  - Stat cards never depend on a rendered list.
  - Counts use exact COUNT(*) on the authoritative tables.
  - List data is fetched in pages; 500,000 is an application fetch ceiling,
    not a database truncation point.
  - Each request remains small enough for PostgREST/browser stability.
  - The count RPC is tenant-scoped and verifies membership before counting.
*/

create or replace function public.get_company_counts(p_company_id uuid)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  result jsonb;
  is_member boolean;
begin
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = p_company_id
      and m.user_id = auth.uid()
      and m.is_active = true
  ) into is_member;

  if not is_member then
    raise exception 'Not authorized for company';
  end if;

  select jsonb_build_object(
    'users_total', (select count(*) from public.company_memberships m where m.company_id=p_company_id and m.is_active=true),
    'users_unique', (select count(distinct m.user_id) from public.company_memberships m where m.company_id=p_company_id and m.is_active=true),
    'departments_total', (select count(*) from public.departments d where d.company_id=p_company_id),
    'teams_total', (select count(*) from public.teams t where t.company_id=p_company_id),
    'ticket_categories_total', (select count(*) from public.ticket_categories c where c.company_id=p_company_id),
    'tickets_total', (select count(*) from public.tickets t where t.company_id=p_company_id),
    'tickets_open', (select count(*) from public.tickets t where t.company_id=p_company_id and t.status='open'),
    'tickets_in_progress', (select count(*) from public.tickets t where t.company_id=p_company_id and t.status='in_progress'),
    'tickets_pending', (select count(*) from public.tickets t where t.company_id=p_company_id and t.status='pending'),
    'tickets_resolved', (select count(*) from public.tickets t where t.company_id=p_company_id and t.status='resolved'),
    'tickets_closed', (select count(*) from public.tickets t where t.company_id=p_company_id and t.status='closed'),
    'tickets_unresolved', (select count(*) from public.tickets t where t.company_id=p_company_id and t.status in ('open','in_progress','pending')),
    'tickets_overdue', (select count(*) from public.tickets t where t.company_id=p_company_id and t.due_at<now() and t.status not in ('resolved','closed')),
    'assets_total', (select count(*) from public.assets a where a.company_id=p_company_id),
    'asset_assignments_active', (select count(*) from public.asset_assignments aa join public.assets a on a.id=aa.asset_id where a.company_id=p_company_id and aa.unassigned_at is null),
    'ticket_assignments_active', (select count(*) from public.ticket_assignments ta join public.tickets t on t.id=ta.ticket_id where t.company_id=p_company_id and ta.unassigned_at is null),
    'ticket_comments_total', (select count(*) from public.ticket_comments tc join public.tickets t on t.id=tc.ticket_id where t.company_id=p_company_id),
    'ticket_attachments_total', (select count(*) from public.ticket_attachments ta join public.tickets t on t.id=ta.ticket_id where t.company_id=p_company_id),
    'workspace_folders_total', (select count(*) from public.workspace_folders f where f.company_id=p_company_id),
    'workspace_files_total', (select count(*) from public.workspace_files f where f.company_id=p_company_id),
    'notifications_unread', (select count(*) from public.notifications n where n.company_id=p_company_id and n.recipient_id=auth.uid() and n.read_at is null),
    'attendance_today', (select count(*) from public.attendance a where a.company_id=p_company_id and a.attendance_date=current_date),
    'qr_codes_active', (select count(*) from public.qr_codes q where q.company_id=p_company_id and q.status='active'),
    'qr_scans_today', (select count(*) from public.qr_scan_logs s join public.qr_codes q on q.id=s.qr_code_id where q.company_id=p_company_id and s.scanned_at>=current_date and s.scanned_at<current_date+interval '1 day'),
    'video_calls_total', (select count(*) from public.video_calls c where c.company_id=p_company_id),
    'video_calls_active', (select count(*) from public.video_calls c where c.company_id=p_company_id and c.status='active'),
    'subscriptions_total', (select count(*) from public.subscriptions s where s.company_id=p_company_id),
    'payments_total', (select count(*) from public.payments p where p.company_id=p_company_id),
    'audit_logs_total', (select count(*) from public.audit_logs l where l.company_id=p_company_id)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_company_counts(uuid) from public;
revoke execute on function public.get_company_counts(uuid) from anon;
grant execute on function public.get_company_counts(uuid) to authenticated;

comment on function public.get_company_counts(uuid) is 'Exact source-of-truth company statistics. Requires active membership in the requested company.';

/* Supporting indexes for exact counts and primary list workloads. */
create index if not exists idx_memberships_company_active_user on public.company_memberships(company_id,is_active,user_id);
create index if not exists idx_tickets_company_status_created on public.tickets(company_id,status,created_at desc);
create index if not exists idx_assets_company_status_created on public.assets(company_id,status,created_at desc);
create index if not exists idx_departments_company_created on public.departments(company_id,created_at desc);
create index if not exists idx_teams_company_created on public.teams(company_id,created_at desc);
create index if not exists idx_workspace_files_company_updated on public.workspace_files(company_id,updated_at desc);
create index if not exists idx_notifications_recipient_unread on public.notifications(recipient_id,company_id,created_at desc) where read_at is null;
create index if not exists idx_attendance_company_date_user on public.attendance(company_id,attendance_date,user_id);
create index if not exists idx_qr_scan_logs_code_scanned on public.qr_scan_logs(qr_code_id,scanned_at desc);
create index if not exists idx_audit_logs_company_created on public.audit_logs(company_id,created_at desc);

analyze public.company_memberships;
analyze public.tickets;
analyze public.assets;
analyze public.departments;
analyze public.teams;
analyze public.workspace_files;
analyze public.notifications;
analyze public.attendance;
analyze public.qr_scan_logs;
analyze public.audit_logs;
