/* Phase 3: notification field consistency and entitlement synchronization. */
alter table public.notifications drop column if exists message;

create table if not exists public.plan_feature_entitlements(
  plan_key text not null,
  feature_key text not null,
  enabled boolean not null default true,
  primary key(plan_key,feature_key)
);
alter table public.plan_feature_entitlements enable row level security;
drop policy if exists plan_feature_entitlements_select_authenticated on public.plan_feature_entitlements;
create policy plan_feature_entitlements_select_authenticated on public.plan_feature_entitlements for select to authenticated using(true);

create or replace function public.sync_company_entitlements(p_company_id uuid) returns void language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare v_plan text;begin
 select plan_key into v_plan from public.subscriptions where company_id=p_company_id and status in('trialing','active','past_due','paused') order by created_at desc limit 1;
 delete from public.company_entitlements where company_id=p_company_id;
 if v_plan is null then return;end if;
 insert into public.company_entitlements(company_id,feature_key,enabled,source_plan) select p_company_id,feature_key,enabled,v_plan from public.plan_feature_entitlements where plan_key=v_plan;
end;$$;
revoke all on function public.sync_company_entitlements(uuid) from public;
create or replace function public.trg_sync_company_entitlements() returns trigger language plpgsql security definer set search_path=public,private,pg_catalog as $$begin perform public.sync_company_entitlements(coalesce(new.company_id,old.company_id));return coalesce(new,old);end;$$;
drop trigger if exists subscriptions_sync_entitlements on public.subscriptions;
create trigger subscriptions_sync_entitlements after insert or update of plan_key,status on public.subscriptions for each row execute function public.trg_sync_company_entitlements();

-- Keep the entitlement resolver deterministic even when a company has no active subscription.
create or replace function public.can_use_feature(p_company_id uuid,p_feature_key text) returns boolean language sql security definer stable set search_path=public,private,pg_catalog as $$
 select exists(select 1 from public.company_memberships m where m.company_id=p_company_id and m.user_id=auth.uid() and m.is_active=true)
 and exists(select 1 from public.company_entitlements e where e.company_id=p_company_id and e.feature_key=p_feature_key and e.enabled=true);
$$;
revoke all on function public.can_use_feature(uuid,text) from public;
grant execute on function public.can_use_feature(uuid,text) to authenticated;
