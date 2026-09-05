-- Ensure newly-created inherited child rows cannot omit or forge tenant identity.

create or replace function private.set_ticket_assignment_company_id()
returns trigger language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare v_company uuid;
begin
  select company_id into v_company from public.tickets where id=new.ticket_id;
  if v_company is null then raise exception 'Ticket not found'; end if;
  if new.company_id is not null and new.company_id<>v_company then raise exception 'Ticket assignment tenant does not match ticket'; end if;
  new.company_id:=v_company;
  return new;
end;
$$;
drop trigger if exists set_ticket_assignment_company_id on public.ticket_assignments;
create trigger set_ticket_assignment_company_id before insert or update of ticket_id,company_id on public.ticket_assignments for each row execute function private.set_ticket_assignment_company_id();

create or replace function private.set_qr_scan_company_id()
returns trigger language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare v_company uuid;
begin
  select company_id into v_company from public.qr_codes where id=new.qr_code_id;
  if v_company is null then raise exception 'QR code not found'; end if;
  if new.company_id is not null and new.company_id<>v_company then raise exception 'QR scan tenant does not match QR code'; end if;
  new.company_id:=v_company;
  return new;
end;
$$;
drop trigger if exists set_qr_scan_company_id on public.qr_scan_logs;
create trigger set_qr_scan_company_id before insert or update of qr_code_id,company_id on public.qr_scan_logs for each row execute function private.set_qr_scan_company_id();
