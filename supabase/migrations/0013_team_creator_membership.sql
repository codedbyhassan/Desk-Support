-- Desk-Support canonical database redesign
-- Migration 0013: allow a team creator to add their own lead membership.
-- This closes the create-team workflow without granting arbitrary membership writes.

create policy team_members_insert_team_creator on public.team_members
for insert to authenticated
with check (
  exists (
    select 1
    from public.teams t
    where t.id = team_members.team_id
      and t.created_by = (select auth.uid())
      and team_members.user_id = (select auth.uid())
      and team_members.role = 'lead'
  )
);
