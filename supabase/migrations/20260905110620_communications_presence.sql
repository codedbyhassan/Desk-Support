create or replace function public.set_presence(p_online boolean) returns void language plpgsql security invoker set search_path=public,private as $$ begin update public.profiles set is_online=p_online,last_seen_at=case when p_online then last_seen_at else now() end,updated_at=now() where id=auth.uid(); end; $$;
grant execute on function public.set_presence(boolean) to authenticated;
