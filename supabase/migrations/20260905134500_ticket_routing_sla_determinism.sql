/* Phase 3: deterministic ticket routing/SLA evaluation. */
create or replace function private.route_then_apply_ticket_sla() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare c public.ticket_categories%rowtype;p public.ticket_sla_policies%rowtype;
begin
 if new.category_id is not null then
  select * into c from public.ticket_categories where id=new.category_id and company_id=new.company_id and is_active=true;
  if found then if new.department_id is null then new.department_id:=c.department_id;end if;if new.team_id is null then new.team_id:=c.team_id;end if;end if;
 end if;
 if new.sla_policy_id is null then
  select * into p from public.ticket_sla_policies where company_id=new.company_id and is_active=true
   and(department_id is null or department_id=new.department_id)and(category_id is null or category_id=new.category_id)and(priority is null or priority=new.priority)
   order by(department_id is not null)::int desc,(category_id is not null)::int desc,(priority is not null)::int desc,id limit 1;
  if found then new.sla_policy_id:=p.id;new.first_response_due_at:=coalesce(new.first_response_due_at,new.created_at+make_interval(mins=>p.first_response_minutes));new.due_at:=coalesce(new.due_at,new.created_at+make_interval(mins=>p.resolution_minutes));end if;
 end if;
 return new;
end;$$;
drop trigger if exists tickets_route_category on public.tickets;
drop trigger if exists tickets_apply_sla on public.tickets;
create trigger tickets_route_then_apply_sla before insert or update of company_id,category_id,department_id,team_id,priority on public.tickets for each row execute function private.route_then_apply_ticket_sla();
