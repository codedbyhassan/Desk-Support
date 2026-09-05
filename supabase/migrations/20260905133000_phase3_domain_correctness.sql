/* Phase 3: domain correctness primitives. Append-only; does not rewrite earlier migrations. */

-- Attendance: preserve every work/break session instead of overwriting one daily row.
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  type text not null default 'work',
  source text not null default 'manual',
  qr_code_id uuid references public.qr_codes(id) on delete set null,
  location jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_sessions_type_check check (type in ('work','break')),
  constraint attendance_sessions_time_check check (ended_at is null or ended_at >= started_at)
);
create index if not exists attendance_sessions_company_user_started_idx on public.attendance_sessions(company_id,user_id,started_at desc);
create index if not exists attendance_sessions_company_started_idx on public.attendance_sessions(company_id,started_at desc);
create index if not exists attendance_sessions_open_idx on public.attendance_sessions(company_id,user_id,started_at desc) where ended_at is null;
alter table public.attendance_sessions enable row level security;
drop policy if exists attendance_sessions_select_member on public.attendance_sessions;
create policy attendance_sessions_select_member on public.attendance_sessions for select to authenticated using (company_id = any(public.current_company_id_array()));
drop policy if exists attendance_sessions_insert_own on public.attendance_sessions;
create policy attendance_sessions_insert_own on public.attendance_sessions for insert to authenticated with check (user_id = auth.uid() and company_id = any(public.current_company_id_array()));
drop policy if exists attendance_sessions_update_own on public.attendance_sessions;
create policy attendance_sessions_update_own on public.attendance_sessions for update to authenticated using (user_id = auth.uid() and company_id = any(public.current_company_id_array())) with check (user_id = auth.uid() and company_id = any(public.current_company_id_array()));

-- Seed sessions from the old daily model without deleting historical attendance.
insert into public.attendance_sessions(company_id,user_id,started_at,ended_at,type,source,metadata,created_at,updated_at)
select company_id,user_id,check_in,check_out,'work','legacy_attendance',coalesce(metadata,'{}'::jsonb),created_at,updated_at
from public.attendance
where check_in is not null
  and not exists (
    select 1 from public.attendance_sessions s
    where s.company_id=attendance.company_id and s.user_id=attendance.user_id and s.started_at=attendance.check_in
  );

-- QR scan is now one transaction: authorization, validation, restrictions, attendance and log.
create or replace function public.scan_attendance_qr(
  p_code text,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=public,private,pg_catalog
as $$
declare
  v_user uuid := auth.uid();
  v_qr public.qr_codes%rowtype;
  v_company uuid;
  v_log uuid;
  v_session public.attendance_sessions%rowtype;
  v_action text;
  v_restriction record;
  v_role text;
  v_parts text[];
  v_distance numeric;
begin
  if v_user is null then raise exception 'Unauthorized'; end if;
  select cm.company_id into v_company
  from public.company_memberships cm
  where cm.user_id=v_user and cm.is_active=true
  order by cm.joined_at desc limit 1;
  if v_company is null then raise exception 'Active company membership required'; end if;

  select * into v_qr from public.qr_codes q
  where q.code=trim(p_code) and q.company_id=v_company
  limit 1;
  if not found then raise exception 'QR code not found or not authorized'; end if;

  if v_qr.status <> 'active' or (v_qr.expires_at is not null and v_qr.expires_at <= now()) then
    insert into public.qr_scan_logs(qr_code_id,user_id,result,latitude,longitude,metadata)
    values(v_qr.id,v_user,'invalid',p_latitude,p_longitude,coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('reason','inactive_or_expired')) returning id into v_log;
    raise exception 'QR code is inactive or expired';
  end if;

  for v_restriction in select restriction_type,value from public.qr_restrictions where qr_code_id=v_qr.id loop
    if v_restriction.restriction_type='role' then
      select role into v_role from public.company_memberships where company_id=v_company and user_id=v_user and is_active=true limit 1;
      if v_role is null or v_role <> v_restriction.value then raise exception 'QR role restriction failed'; end if;
    elsif v_restriction.restriction_type='location' then
      if p_latitude is null or p_longitude is null then raise exception 'Location is required for this QR code'; end if;
      v_parts := regexp_split_to_array(trim(v_restriction.value), '\\s*,\\s*');
      if array_length(v_parts,1) <> 3 then raise exception 'Invalid QR location restriction'; end if;
      v_distance := 6371000 * 2 * asin(sqrt(
        power(sin(radians(p_latitude::numeric-v_parts[1]::numeric)/2),2) +
        cos(radians(p_latitude))*cos(radians(v_parts[1]::numeric))*power(sin(radians(p_longitude::numeric-v_parts[2]::numeric)/2),2)
      ));
      if v_distance > v_parts[3]::numeric then raise exception 'QR location restriction failed'; end if;
    else
      raise exception 'Unsupported QR restriction type: %', v_restriction.restriction_type;
    end if;
  end loop;

  select * into v_session from public.attendance_sessions s
  where s.company_id=v_company and s.user_id=v_user and s.type='work' and s.ended_at is null
  order by s.started_at desc limit 1;

  if found then
    update public.attendance_sessions set ended_at=now(),updated_at=now() where id=v_session.id returning * into v_session;
    v_action := 'clock_out';
  else
    insert into public.attendance_sessions(company_id,user_id,started_at,type,source,qr_code_id,location,metadata)
    values(v_company,v_user,now(),'work','qr',v_qr.id,
      case when p_latitude is null or p_longitude is null then null else jsonb_build_object('latitude',p_latitude,'longitude',p_longitude) end,
      coalesce(p_metadata,'{}'::jsonb)) returning * into v_session;
    v_action := 'clock_in';
  end if;

  insert into public.qr_scan_logs(qr_code_id,user_id,result,latitude,longitude,metadata)
  values(v_qr.id,v_user,'valid',p_latitude,p_longitude,coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('action',v_action,'attendance_session_id',v_session.id)) returning id into v_log;

  return jsonb_build_object('ok',true,'action',v_action,'company_id',v_company,'session',to_jsonb(v_session),'scan_id',v_log);
end;
$$;
revoke all on function public.scan_attendance_qr(text,numeric,numeric,jsonb) from public;
grant execute on function public.scan_attendance_qr(text,numeric,numeric,jsonb) to authenticated;

-- Ticket search: all filtering occurs before pagination; cursor is (created_at,id).
create or replace function public.search_tickets(
  p_company_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 50,
  p_status text default null,
  p_assignee_id uuid default null,
  p_asset_id uuid default null,
  p_team_id uuid default null,
  p_department_id uuid default null,
  p_priority text default null,
  p_search text default null,
  p_archived boolean default false,
  p_created_by uuid default null
) returns jsonb
language plpgsql security definer stable set search_path=public,private,pg_catalog
as $$
declare v_items jsonb; v_has_more boolean;
begin
  if not exists(select 1 from public.company_memberships m where m.company_id=p_company_id and m.user_id=auth.uid() and m.is_active=true) then raise exception 'Not authorized for company'; end if;
  if p_limit < 1 or p_limit > 100 then raise exception 'Invalid page size'; end if;
  with filtered as (
    select t.*,
      coalesce((select jsonb_agg(a order by a.assigned_at desc) from public.ticket_assignments a where a.ticket_id=t.id and a.unassigned_at is null),'[]'::jsonb) as assignment_rows
    from public.tickets t
    where t.company_id=p_company_id
      and ((p_archived and t.archived_at is not null) or (not p_archived and t.archived_at is null))
      and (p_status is null or t.status::text=p_status)
      and (p_priority is null or t.priority::text=p_priority)
      and (p_department_id is null or t.department_id=p_department_id)
      and (p_team_id is null or t.team_id=p_team_id)
      and (p_created_by is null or t.created_by=p_created_by)
      and (p_assignee_id is null or exists(select 1 from public.ticket_assignments a where a.ticket_id=t.id and a.assignee_id=p_assignee_id and a.unassigned_at is null))
      and (p_asset_id is null or exists(select 1 from public.asset_tickets at where at.ticket_id=t.id and at.asset_id=p_asset_id))
      and (nullif(trim(p_search),'') is null or t.subject ilike '%'||trim(p_search)||'%' or coalesce(t.description,'') ilike '%'||trim(p_search)||'%' or t.ticket_number::text ilike '%'||trim(p_search)||'%')
      and (p_cursor_created_at is null or (t.created_at,p_cursor_id) < (p_cursor_created_at,p_cursor_id))
    order by t.created_at desc,t.id desc
    limit p_limit+1
  ), bounded as (select * from filtered limit p_limit)
  select coalesce(jsonb_agg(to_jsonb(b) - 'assignment_rows' order by b.created_at desc,b.id desc),'[]'::jsonb), (select count(*) from filtered)>p_limit into v_items,v_has_more from bounded b;
  return jsonb_build_object('items',v_items,'has_more',v_has_more,'next_cursor',case when v_has_more then jsonb_build_object('created_at',(select max(created_at) from bounded),'id',(select min(id) from bounded where created_at=(select min(created_at) from bounded))) else null end);
end;
$$;
revoke all on function public.search_tickets(uuid,timestamptz,uuid,integer,text,uuid,uuid,uuid,uuid,text,text,boolean,uuid) from public;
grant execute on function public.search_tickets(uuid,timestamptz,uuid,integer,text,uuid,uuid,uuid,uuid,text,text,boolean,uuid) to authenticated;

-- Notification deletion matches the existing UI contract.
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete to authenticated using (recipient_id=auth.uid() and company_id=any(public.current_company_id_array()));

-- Workspace has one private bucket; callers may not select another bucket.
insert into storage.buckets(id,name,public,file_size_limit)
values('workspace','workspace',false,52428800)
on conflict (id) do update set public=false,file_size_limit=52428800;

-- Entitlements are resolved from the current subscription, with explicit plan feature definitions.
create table if not exists public.company_entitlements (
  company_id uuid not null references public.companies(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  source_plan text,
  updated_at timestamptz not null default now(),
  primary key(company_id,feature_key)
);
alter table public.company_entitlements enable row level security;
drop policy if exists company_entitlements_select_member on public.company_entitlements;
create policy company_entitlements_select_member on public.company_entitlements for select to authenticated using (company_id=any(public.current_company_id_array()));
create or replace function public.can_use_feature(p_company_id uuid,p_feature_key text) returns boolean
language sql security definer stable set search_path=public,private,pg_catalog as $$
  select exists(select 1 from public.company_memberships m where m.company_id=p_company_id and m.user_id=auth.uid() and m.is_active=true)
  and exists(select 1 from public.company_entitlements e where e.company_id=p_company_id and e.feature_key=p_feature_key and e.enabled=true);
$$;
revoke all on function public.can_use_feature(uuid,text) from public;
grant execute on function public.can_use_feature(uuid,text) to authenticated;

comment on table public.attendance_sessions is 'Canonical attendance session ledger; daily totals are derived from sessions.';
comment on function public.scan_attendance_qr(text,numeric,numeric,jsonb) is 'Transactional QR attendance operation: authorize, validate, apply restrictions, mutate session and log scan.';
comment on function public.search_tickets(uuid,timestamptz,uuid,integer,text,uuid,uuid,uuid,uuid,text,text,boolean,uuid) is 'Tenant-scoped server-side ticket filtering with cursor pagination.';
