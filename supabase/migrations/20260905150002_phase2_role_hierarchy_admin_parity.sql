-- The hierarchy is descending privilege. An administrator may assign any valid role,
-- including another administrator; HR and below may not grant a role above themselves.
create or replace function public.can_assign_role(p_actor_role text,p_target_role text)
returns boolean language sql immutable strict as $$
  select private.role_rank(p_actor_role) >= private.role_rank(p_target_role)
    and private.role_rank(p_actor_role) >= 0
    and private.role_rank(p_target_role) >= 0;
$$;
