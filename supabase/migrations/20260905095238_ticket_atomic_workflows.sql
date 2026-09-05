-- Make ticket state changes atomic. Client-side sequences such as
-- UPDATE ticket -> INSERT history can otherwise leave an inconsistent ticket
-- if the second operation fails.

create or replace function public.update_ticket_status(p_ticket_id uuid,p_status public.ticket_status,p_note text default null)
returns public.tickets language plpgsql security invoker set search_path = public, pg_catalog
as $$
declare current_ticket public.tickets%rowtype; changed_at timestamptz := now(); result_ticket public.tickets%rowtype;
begin
  select * into current_ticket from public.tickets where id=p_ticket_id for update;
  if not found then raise exception 'Ticket not found'; end if;
  if not private.can_manage_ticket(p_ticket_id) then raise exception 'Not authorized to update this ticket'; end if;
  if current_ticket.status=p_status then return current_ticket; end if;
  update public.tickets set status=p_status,
    resolved_at=case when p_status='resolved'::public.ticket_status then changed_at when p_status='closed'::public.ticket_status then coalesce(current_ticket.resolved_at,changed_at) else null end,
    closed_at=case when p_status='closed'::public.ticket_status then changed_at else null end,
    updated_at=changed_at
  where id=p_ticket_id returning * into result_ticket;
  insert into public.ticket_status_history(ticket_id,from_status,to_status,changed_by,changed_at,note)
  values(p_ticket_id,current_ticket.status,p_status,(select auth.uid()),changed_at,nullif(btrim(p_note),''));
  return result_ticket;
end;
$$;
revoke all on function public.update_ticket_status(uuid,public.ticket_status,text) from public,anon;
grant execute on function public.update_ticket_status(uuid,public.ticket_status,text) to authenticated;

create or replace function public.assign_ticket(p_ticket_id uuid,p_assignee_id uuid,p_department_id uuid default null,p_team_id uuid default null)
returns public.tickets language plpgsql security invoker set search_path = public, pg_catalog
as $$
declare current_ticket public.tickets%rowtype; result_ticket public.tickets%rowtype; now_at timestamptz:=now(); next_department uuid; next_team uuid;
begin
  select * into current_ticket from public.tickets where id=p_ticket_id for update;
  if not found then raise exception 'Ticket not found'; end if;
  if not private.has_company_role(current_ticket.company_id,array['admin','hr','manager']::public.membership_role[]) then raise exception 'Not authorized to assign this ticket'; end if;
  if not exists(select 1 from public.company_memberships m where m.company_id=current_ticket.company_id and m.user_id=p_assignee_id and m.is_active=true) then raise exception 'The selected assignee is not an active member of this company'; end if;
  next_department:=case when p_department_id is null then current_ticket.department_id else p_department_id end;
  next_team:=case when p_team_id is null then current_ticket.team_id else p_team_id end;
  if next_department is not null and not exists(select 1 from public.departments d where d.id=next_department and d.company_id=current_ticket.company_id) then raise exception 'Department does not belong to this company'; end if;
  if next_team is not null and not exists(select 1 from public.teams t where t.id=next_team and t.company_id=current_ticket.company_id) then raise exception 'Team does not belong to this company'; end if;
  update public.ticket_assignments set unassigned_at=now_at where ticket_id=p_ticket_id and unassigned_at is null;
  insert into public.ticket_assignments(ticket_id,assignee_id,assigned_by,assigned_at,department_id,team_id)
  values(p_ticket_id,p_assignee_id,(select auth.uid()),now_at,next_department,next_team);
  update public.tickets set department_id=next_department,team_id=next_team,updated_at=now_at where id=p_ticket_id returning * into result_ticket;
  return result_ticket;
end;
$$;
revoke all on function public.assign_ticket(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.assign_ticket(uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.accept_ticket(p_ticket_id uuid)
returns public.tickets language plpgsql security invoker set search_path = public, pg_catalog
as $$
declare current_ticket public.tickets%rowtype; result_ticket public.tickets%rowtype; now_at timestamptz:=now();
begin
  select * into current_ticket from public.tickets where id=p_ticket_id for update;
  if not found then raise exception 'Ticket not found'; end if;
  if not private.can_manage_ticket(p_ticket_id) then raise exception 'Not authorized to accept this ticket'; end if;
  if not (private.has_company_role(current_ticket.company_id,array['admin','hr','manager']::public.membership_role[]) or exists(select 1 from public.ticket_assignments ta where ta.ticket_id=p_ticket_id and ta.assignee_id=(select auth.uid()) and ta.unassigned_at is null)) then raise exception 'Only the assigned agent or a manager can accept this ticket'; end if;
  if current_ticket.status='in_progress' and current_ticket.accepted_by is not null then return current_ticket; end if;
  update public.tickets set status='in_progress'::public.ticket_status,accepted_by=(select auth.uid()),accepted_at=coalesce(accepted_at,now_at),updated_at=now_at where id=p_ticket_id returning * into result_ticket;
  if current_ticket.status<>'in_progress'::public.ticket_status then
    insert into public.ticket_status_history(ticket_id,from_status,to_status,changed_by,changed_at,note)
    values(p_ticket_id,current_ticket.status,'in_progress'::public.ticket_status,(select auth.uid()),now_at,'Ticket accepted');
  end if;
  return result_ticket;
end;
$$;
revoke all on function public.accept_ticket(uuid) from public,anon;
grant execute on function public.accept_ticket(uuid) to authenticated;
