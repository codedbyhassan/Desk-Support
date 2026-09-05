create or replace function public.get_or_create_team_conversation(p_team_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public,private
as $$
declare
  v_me uuid := auth.uid();
  v_company uuid;
  v_team_name text;
  v_conversation uuid;
begin
  if v_me is null or p_team_id is null then
    raise exception 'Invalid request';
  end if;

  select company_id, name into v_company, v_team_name
  from public.teams where id = p_team_id;

  if v_company is null or not private.is_company_member(v_company, v_me) then
    raise exception 'Not authorized';
  end if;

  if not exists (select 1 from public.team_members where team_id = p_team_id and user_id = v_me) then
    raise exception 'Not a team member';
  end if;

  select c.id into v_conversation
  from public.conversations c
  where c.company_id = v_company
    and c.kind = 'team'
    and c.metadata->>'team_id' = p_team_id::text
  limit 1;

  if v_conversation is null then
    insert into public.conversations(company_id, kind, title, created_by, metadata)
    values (v_company, 'team', v_team_name, v_me, jsonb_build_object('team_id', p_team_id))
    returning id into v_conversation;
  end if;

  insert into public.conversation_members(conversation_id, user_id, role)
  select v_conversation, tm.user_id,
         case when tm.role = 'lead' then 'owner' else 'member' end
  from public.team_members tm
  where tm.team_id = p_team_id
  on conflict (conversation_id, user_id) do update
    set role = excluded.role;

  return v_conversation;
end;
$$;

grant execute on function public.get_or_create_team_conversation(uuid) to authenticated;
