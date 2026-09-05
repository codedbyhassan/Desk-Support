-- Phase 2 security hardening.
-- All authorization decisions are resolved from auth.uid() and database state.

create or replace function private.role_rank(p_role text)
returns integer language sql immutable strict as $$
  select case p_role when 'admin' then 5 when 'hr' then 4 when 'manager' then 3 when 'employee' then 2 when 'contractor' then 1 when 'viewer' then 0 else -1 end;
$$;

create or replace function public.can_assign_role(p_actor_role text,p_target_role text)
returns boolean language sql immutable strict as $$
  select private.role_rank(p_actor_role) > private.role_rank(p_target_role) and private.role_rank(p_target_role) >= 0;
$$;

create or replace function public.can_actor_assign_role(p_company_id uuid,p_target_role text)
returns boolean language plpgsql stable security definer set search_path=public,private,pg_catalog as $$
declare v_role text;
begin
  if auth.uid() is null then return false; end if;
  select role::text into v_role from public.company_memberships where company_id=p_company_id and user_id=auth.uid() and is_active=true;
  return v_role is not null and public.can_assign_role(v_role,p_target_role);
end;
$$;
revoke all on function public.can_assign_role(text,text) from public;
grant execute on function public.can_assign_role(text,text) to authenticated;
revoke all on function public.can_actor_assign_role(uuid,text) from public;
grant execute on function public.can_actor_assign_role(uuid,text) to authenticated;

create or replace function private.enforce_membership_role_change()
returns trigger language plpgsql security definer set search_path=public,private,pg_catalog as $$
begin
  if auth.uid() is null then return new; end if;
  if not public.can_actor_assign_role(new.company_id,new.role::text) then raise exception 'Not authorized to assign membership role'; end if;
  return new;
end;
$$;
drop trigger if exists enforce_membership_role_change on public.company_memberships;
create trigger enforce_membership_role_change before insert or update of role,company_id,user_id on public.company_memberships for each row execute function private.enforce_membership_role_change();

create or replace function private.prevent_admin_lockout()
returns trigger language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare v_count integer;
begin
  if auth.uid() is null then return new; end if;
  if new.user_id=auth.uid() and old.is_active and not new.is_active then raise exception 'You cannot deactivate your own membership'; end if;
  if old.is_active and not new.is_active and old.role::text='admin' then
    select count(*) into v_count from public.company_memberships where company_id=old.company_id and role::text='admin' and is_active=true;
    if v_count<=1 then raise exception 'The company must retain at least one active administrator'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_admin_lockout on public.company_memberships;
create trigger prevent_admin_lockout before update of is_active,user_id,company_id on public.company_memberships for each row execute function private.prevent_admin_lockout();

create or replace function private.enforce_conversation_member_mutation()
returns trigger language plpgsql security definer set search_path=public,private,pg_catalog as $$
begin
  if auth.uid() is null then return new; end if;
  if new.role is distinct from old.role or new.conversation_id is distinct from old.conversation_id or new.user_id is distinct from old.user_id then
    if not private.can_manage_conversation(old.conversation_id,auth.uid()) then raise exception 'Only conversation owners/admins may change membership identity or role'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_conversation_member_mutation on public.conversation_members;
create trigger enforce_conversation_member_mutation before update on public.conversation_members for each row execute function private.enforce_conversation_member_mutation();

create or replace function public.manage_conversation_member(p_conversation_id uuid,p_user_id uuid,p_role text default 'member',p_new_user_id uuid default null,p_new_conversation_id uuid default null)
returns void language plpgsql security invoker set search_path=public,private,pg_catalog as $$
declare v_target uuid:=coalesce(p_new_user_id,p_user_id); v_conversation uuid:=coalesce(p_new_conversation_id,p_conversation_id); v_company uuid;
begin
  if auth.uid() is null or p_role not in ('owner','admin','member') then raise exception 'Invalid membership mutation'; end if;
  if not private.can_manage_conversation(p_conversation_id,auth.uid()) then raise exception 'Not authorized'; end if;
  select company_id into v_company from public.conversations where id=v_conversation;
  if v_company is null or not exists(select 1 from public.company_memberships where company_id=v_company and user_id=v_target and is_active=true) then raise exception 'Target user is not an active member of the conversation company'; end if;
  update public.conversation_members set conversation_id=v_conversation,user_id=v_target,role=p_role where conversation_id=p_conversation_id and user_id=p_user_id;
  if not found then raise exception 'Conversation membership not found'; end if;
end;
$$;
revoke all on function public.manage_conversation_member(uuid,uuid,text,uuid,uuid) from public;
grant execute on function public.manage_conversation_member(uuid,uuid,text,uuid,uuid) to authenticated;

create or replace function private.prevent_call_lifecycle_update()
returns trigger language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare v_initiator boolean; v_admin boolean;
begin
  if auth.uid() is null then return new; end if;
  if new.status is distinct from old.status or new.ended_at is distinct from old.ended_at or new.end_reason is distinct from old.end_reason then
    select c.initiator_id=auth.uid(),private.has_company_role(c.company_id,array['admin']::public.membership_role[]) into v_initiator,v_admin from public.calls c where c.id=old.id;
    if not coalesce(v_initiator,false) and not coalesce(v_admin,false) then raise exception 'Only the call initiator or company administrator may change call lifecycle'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_call_lifecycle_update on public.calls;
create trigger prevent_call_lifecycle_update before update on public.calls for each row execute function private.prevent_call_lifecycle_update();

create or replace function public.leave_call(p_call_id uuid)
returns void language plpgsql security invoker set search_path=public,private,pg_catalog as $$
begin
  if not exists(select 1 from public.call_participants_v2 where call_id=p_call_id and user_id=auth.uid()) then raise exception 'Not a call participant'; end if;
  update public.call_participants_v2 set status='left',left_at=coalesce(left_at,now()) where call_id=p_call_id and user_id=auth.uid();
end;
$$;
revoke all on function public.leave_call(uuid) from public;
grant execute on function public.leave_call(uuid) to authenticated;

create or replace function public.end_call(p_call_id uuid,p_reason text default 'ended')
returns void language plpgsql security invoker set search_path=public,private,pg_catalog as $$
declare v_initiator uuid; v_company uuid;
begin
  select initiator_id,company_id into v_initiator,v_company from public.calls where id=p_call_id;
  if v_initiator is null then raise exception 'Call not found'; end if;
  if auth.uid()<>v_initiator and not private.has_company_role(v_company,array['admin']::public.membership_role[]) then raise exception 'Not authorized to end call'; end if;
  update public.calls set status='ended',ended_at=coalesce(ended_at,now()),end_reason=coalesce(p_reason,'ended'),updated_at=now() where id=p_call_id;
end;
$$;
revoke all on function public.end_call(uuid,text) from public;
grant execute on function public.end_call(uuid,text) to authenticated;

-- Tenant-aware composite keys. NOT VALID is intentional until production data is explicitly checked;
-- PostgreSQL still enforces these constraints for all new and updated rows.
create unique index if not exists departments_company_id_id_key on public.departments(company_id,id);
create unique index if not exists teams_company_id_id_key on public.teams(company_id,id);
create unique index if not exists company_memberships_company_user_key on public.company_memberships(company_id,user_id);
create unique index if not exists conversations_company_id_id_key on public.conversations(company_id,id);
alter table public.tickets drop constraint if exists tickets_department_fk;
alter table public.tickets add constraint tickets_department_company_fk foreign key(company_id,department_id) references public.departments(company_id,id) not valid;
alter table public.tickets drop constraint if exists tickets_team_fk;
alter table public.tickets add constraint tickets_team_company_fk foreign key(company_id,team_id) references public.teams(company_id,id) not valid;

alter table public.ticket_assignments add column if not exists company_id uuid;
update public.ticket_assignments ta set company_id=t.company_id from public.tickets t where t.id=ta.ticket_id and ta.company_id is null;
alter table public.ticket_assignments alter column company_id set not null;
create unique index if not exists ticket_assignments_company_id_id_key on public.ticket_assignments(company_id,id);
alter table public.ticket_assignments add constraint ticket_assignments_ticket_company_fk foreign key(company_id,ticket_id) references public.tickets(company_id,id) not valid;
alter table public.ticket_assignments add constraint ticket_assignments_assignee_company_fk foreign key(company_id,assignee_id) references public.company_memberships(company_id,user_id) not valid;
alter table public.ticket_assignments add constraint ticket_assignments_department_company_fk foreign key(company_id,department_id) references public.departments(company_id,id) not valid;
alter table public.ticket_assignments add constraint ticket_assignments_team_company_fk foreign key(company_id,team_id) references public.teams(company_id,id) not valid;
alter table public.notifications add constraint notifications_recipient_company_fk foreign key(company_id,recipient_id) references public.company_memberships(company_id,user_id) not valid;
alter table public.attendance add constraint attendance_user_company_fk foreign key(company_id,user_id) references public.company_memberships(company_id,user_id) not valid;
alter table public.audit_logs add constraint audit_logs_actor_company_fk foreign key(company_id,actor_id) references public.company_memberships(company_id,user_id) not valid;
alter table public.qr_scan_logs add column if not exists company_id uuid;
update public.qr_scan_logs s set company_id=q.company_id from public.qr_codes q where q.id=s.qr_code_id and s.company_id is null;
alter table public.qr_scan_logs alter column company_id set not null;
create unique index if not exists qr_scan_logs_company_id_id_key on public.qr_scan_logs(company_id,id);
alter table public.qr_scan_logs add constraint qr_scan_logs_qr_company_fk foreign key(company_id,qr_code_id) references public.qr_codes(company_id,id) not valid;
alter table public.qr_scan_logs add constraint qr_scan_logs_user_company_fk foreign key(company_id,user_id) references public.company_memberships(company_id,user_id) not valid;
alter table public.calls add constraint calls_conversation_company_fk foreign key(company_id,conversation_id) references public.conversations(company_id,id) not valid;

-- Security-critical membership mutations create their own audit records inside the same transaction.
create or replace function private.audit_membership_security_change()
returns trigger language plpgsql security definer set search_path=public,private,pg_catalog as $$
begin
  if old.role is distinct from new.role then
    insert into public.audit_logs(company_id,actor_id,action,entity_type,entity_id,description,changes,metadata)
    values(new.company_id,auth.uid(),'update','company_membership',new.id,'Membership role changed',jsonb_build_object('before',old.role,'after',new.role),'{}'::jsonb);
  elsif old.is_active is distinct from new.is_active then
    insert into public.audit_logs(company_id,actor_id,action,entity_type,entity_id,description,changes,metadata)
    values(new.company_id,auth.uid(),'update','company_membership',new.id,'Membership status changed',jsonb_build_object('before',old.is_active,'after',new.is_active),'{}'::jsonb);
  end if;
  return new;
end;
$$;
drop trigger if exists audit_membership_security_change on public.company_memberships;
create trigger audit_membership_security_change after update of role,is_active on public.company_memberships for each row execute function private.audit_membership_security_change();

comment on function public.get_company_counts(uuid) is 'Tenant-scoped aggregate; execution requires an active membership in p_company_id.';

-- Deferred validation query to run before VALIDATE CONSTRAINT:
-- select 'tickets_department_company_fk' where exists(select 1 from tickets t join departments d on d.id=t.department_id where t.department_id is not null and t.company_id<>d.company_id);
-- Repeat equivalent checks for every *_company_fk above, then VALIDATE CONSTRAINT each one.
