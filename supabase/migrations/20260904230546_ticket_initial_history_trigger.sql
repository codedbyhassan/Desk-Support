create or replace function private.create_initial_ticket_history() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$ begin insert into public.ticket_status_history(ticket_id,from_status,to_status,changed_by,note) values(new.id,null,new.status,new.created_by,'Ticket created');return new;end;$$;
drop trigger if exists tickets_initial_history on public.tickets;
create trigger tickets_initial_history after insert on public.tickets for each row execute function private.create_initial_ticket_history();
