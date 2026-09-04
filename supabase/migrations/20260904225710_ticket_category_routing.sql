alter table public.ticket_categories add column if not exists department_id uuid, add column if not exists team_id uuid;
alter table public.ticket_categories add constraint ticket_categories_department_fk foreign key (department_id) references public.departments(id);
alter table public.ticket_categories add constraint ticket_categories_team_fk foreign key (team_id) references public.teams(id);
create index if not exists idx_ticket_categories_routing on public.ticket_categories(company_id,department_id,team_id) where is_active=true;
create or replace function private.route_ticket_from_category() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$ declare c public.ticket_categories%rowtype; begin if new.category_id is not null then select * into c from public.ticket_categories where id=new.category_id and company_id=new.company_id and is_active=true; if found then if new.department_id is null then new.department_id:=c.department_id; end if; if new.team_id is null then new.team_id:=c.team_id; end if; end if; end if; return new; end; $$;
drop trigger if exists tickets_route_category on public.tickets;
create trigger tickets_route_category before insert or update of category_id,company_id on public.tickets for each row execute function private.route_ticket_from_category();
