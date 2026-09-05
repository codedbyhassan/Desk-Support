-- Assignment RPC receives explicit routing values so NULL means "clear"
-- rather than being indistinguishable from "keep the current value".
drop function if exists public.assign_ticket(uuid, uuid, uuid, uuid);

create or replace function public.assign_ticket(
  p_ticket_id uuid,
  p_assignee_id uuid,
  p_department_id uuid,
  p_team_id uuid
)
returns public.tickets
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare current_ticket public.tickets%rowtype; result_ticket public.tickets%rowtype; now_at timestamptz:=now();
begin
  select * into current_ticket from public.tickets where id=p_ticket_id for update;
  if not found then raise exception 'Ticket not found'; end if;
  if not private.has_company_role(current_ticket.company_id,array['admin','hr','manager']::public.membership_role[]) then raise exception 'Not authorized to assign this ticket'; end if;
  if not exists(select 1 from public.company_memberships m where m.company_id=current_ticket.company_id and m.user_id=p_assignee_id and m.is_active=true) then raise exception 'The selected assignee is not an active member of this company'; end if;
  if p_department_id is not null and not exists(select 1 from public.departments d where d.id=p_department_id and d.company_id=current_ticket.company_id) then raise exception 'Department does not belong to this company'; end if;
  if p_team_id is not null and not exists(select 1 from public.teams t where t.id=p_team_id and t.company_id=current_ticket.company_id) then raise exception 'Team does not belong to this company'; end if;
  update public.ticket_assignments set unassigned_at=now_at where ticket_id=p_ticket_id and unassigned_at is null;
  insert into public.ticket_assignments(ticket_id,assignee_id,assigned_by,assigned_at,department_id,team_id)
  values(p_ticket_id,p_assignee_id,(select auth.uid()),now_at,p_department_id,p_team_id);
  update public.tickets set department_id=p_department_id,team_id=p_team_id,updated_at=now_at where id=p_ticket_id returning * into result_ticket;
  return result_ticket;
end;
$$;

revoke all on function public.assign_ticket(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.assign_ticket(uuid,uuid,uuid,uuid) to authenticated;
