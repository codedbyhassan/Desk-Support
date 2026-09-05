create or replace function private.audit_company_row_change() returns trigger language plpgsql security definer set search_path=public,private as $$
declare company uuid; action audit_action; old_row jsonb; new_row jsonb; entity uuid;
begin
 if tg_op='INSERT' then action='create'; new_row=to_jsonb(new); entity=(new_row->>'id')::uuid; company=case when new_row ? 'company_id' then (new_row->>'company_id')::uuid else null end;
 elsif tg_op='UPDATE' then action='update'; old_row=to_jsonb(old); new_row=to_jsonb(new); entity=(new_row->>'id')::uuid; company=case when new_row ? 'company_id' then (new_row->>'company_id')::uuid else null end;
 else action='delete'; old_row=to_jsonb(old); entity=(old_row->>'id')::uuid; company=case when old_row ? 'company_id' then (old_row->>'company_id')::uuid else null end;
 end if;
 if company is not null then insert into public.audit_logs(company_id,actor_id,action,entity_type,entity_id,description,changes,metadata) values(company,auth.uid(),action,tg_table_name,entity,'Database mutation audit',jsonb_build_object('old',coalesce(old_row,'{}'::jsonb),'new',coalesce(new_row,'{}'::jsonb)),jsonb_build_object('source','phase5_mutation_trigger','operation',tg_op)); end if;
 return coalesce(new,old);
end $$;

create or replace function private.audit_company_row_change_noauth() returns trigger language plpgsql security definer set search_path=public,private as $$
declare company uuid; action audit_action; old_row jsonb; new_row jsonb; entity uuid;
begin
 if tg_op='INSERT' then action='create'; new_row=to_jsonb(new); entity=(new_row->>'id')::uuid; company=case when new_row ? 'company_id' then (new_row->>'company_id')::uuid else null end;
 elsif tg_op='UPDATE' then action='update'; old_row=to_jsonb(old); new_row=to_jsonb(new); entity=(new_row->>'id')::uuid; company=case when new_row ? 'company_id' then (new_row->>'company_id')::uuid else null end;
 else action='delete'; old_row=to_jsonb(old); entity=(old_row->>'id')::uuid; company=case when old_row ? 'company_id' then (old_row->>'company_id')::uuid else null end;
 end if;
 if company is not null then insert into public.audit_logs(company_id,actor_id,action,entity_type,entity_id,description,changes,metadata) values(company,null,action,tg_table_name,entity,'Database mutation audit',jsonb_build_object('old',coalesce(old_row,'{}'::jsonb),'new',coalesce(new_row,'{}'::jsonb)),jsonb_build_object('source','phase5_mutation_trigger','operation',tg_op)); end if;
 return coalesce(new,old);
end $$;

drop trigger if exists phase5_audit_company_memberships on public.company_memberships;
create trigger phase5_audit_company_memberships after insert or update or delete on public.company_memberships for each row execute function private.audit_company_row_change();
drop trigger if exists phase5_audit_tickets on public.tickets;
create trigger phase5_audit_tickets after insert or update or delete on public.tickets for each row execute function private.audit_company_row_change();
drop trigger if exists phase5_audit_assets on public.assets;
create trigger phase5_audit_assets after insert or update or delete on public.assets for each row execute function private.audit_company_row_change();
drop trigger if exists phase5_audit_companies on public.companies;
create trigger phase5_audit_companies after insert or update or delete on public.companies for each row execute function private.audit_company_row_change();
drop trigger if exists phase5_audit_company_settings on public.company_settings;
create trigger phase5_audit_company_settings after insert or update or delete on public.company_settings for each row execute function private.audit_company_row_change();
drop trigger if exists phase5_audit_subscriptions on public.subscriptions;
create trigger phase5_audit_subscriptions after insert or update or delete on public.subscriptions for each row execute function private.audit_company_row_change_noauth();
