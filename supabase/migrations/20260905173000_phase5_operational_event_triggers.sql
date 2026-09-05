create or replace function private.record_operational_row_event() returns trigger language plpgsql security definer set search_path=public as $$
declare company uuid; entity uuid;
begin
 company=case when to_jsonb(new) ? 'company_id' then (to_jsonb(new)->>'company_id')::uuid else (to_jsonb(old)->>'company_id')::uuid end;
 entity=case when tg_op='DELETE' then (to_jsonb(old)->>'id')::uuid else (to_jsonb(new)->>'id')::uuid end;
 insert into public.operational_events(event_type,entity_type,entity_id,company_id,success,metadata)
 values(tg_table_name||'.'||lower(tg_op),tg_table_name,entity,company,true,jsonb_build_object('source','phase5_row_trigger'));
 return coalesce(new,old);
end $$;

drop trigger if exists phase5_ops_tickets on public.tickets;
create trigger phase5_ops_tickets after insert or update or delete on public.tickets for each row execute function private.record_operational_row_event();
drop trigger if exists phase5_ops_calls on public.calls;
create trigger phase5_ops_calls after insert or update or delete on public.calls for each row execute function private.record_operational_row_event();
