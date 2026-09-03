/* Final RLS / privilege hardening. This migration replaces the provisional policies from 0001-0009. */

create schema if not exists private;

create or replace function private.has_company_role(
  p_company_id uuid,
  p_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.company_memberships m
    where m.company_id = p_company_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role = any (p_roles)
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.has_company_role(uuid, public.membership_role[]) from public;
grant execute on function private.has_company_role(uuid, public.membership_role[]) to authenticated;

/* Old helpers remain for compatibility, but anonymous clients cannot execute them. */
revoke execute on function public.current_company_id_array() from anon;
revoke execute on function public.current_company_ids() from anon;
revoke execute on function public.current_company_ids_array() from anon;
grant execute on function public.current_company_id_array() to authenticated;
grant execute on function public.current_company_ids() to authenticated;
grant execute on function public.current_company_ids_array() to authenticated;

/* Remove provisional policies before installing the canonical policy set. */
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

/* PostgREST should never expose these tables to anonymous callers. */
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

/* Trusted-backend-only records. */
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.subscription_events from authenticated;
revoke insert, update, delete on public.notification_deliveries from authenticated;

/* ---------- identity / organisation ---------- */
create policy companies_select_member on public.companies for select to authenticated using (id = any (public.current_company_id_array()));
create policy companies_update_admin on public.companies for update to authenticated using (private.has_company_role(id, array['admin']::public.membership_role[])) with check (private.has_company_role(id, array['admin']::public.membership_role[]));

create policy profiles_select_self_or_company on public.profiles for select to authenticated using (id = auth.uid() or exists (select 1 from public.company_memberships m where m.user_id = profiles.id and m.is_active = true and m.company_id = any (public.current_company_id_array())));
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy memberships_select_member on public.company_memberships for select to authenticated using (company_id = any (public.current_company_id_array()));
create policy memberships_insert_admin on public.company_memberships for insert to authenticated with check (private.has_company_role(company_id, array['admin']::public.membership_role[]));
create policy memberships_update_admin on public.company_memberships for update to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[])) with check (private.has_company_role(company_id, array['admin']::public.membership_role[]));
create policy memberships_delete_admin on public.company_memberships for delete to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[]));

create policy company_settings_select_member on public.company_settings for select to authenticated using (company_id = any (public.current_company_id_array()));
create policy company_settings_insert_admin on public.company_settings for insert to authenticated with check (private.has_company_role(company_id, array['admin']::public.membership_role[]));
create policy company_settings_update_admin on public.company_settings for update to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[])) with check (private.has_company_role(company_id, array['admin']::public.membership_role[]));
create policy company_settings_delete_admin on public.company_settings for delete to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[]));

create policy departments_select_member on public.departments for select to authenticated using (company_id = any (public.current_company_id_array()));
create policy departments_insert_manager on public.departments for insert to authenticated with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy departments_update_manager on public.departments for update to authenticated using (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[])) with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy departments_delete_admin on public.departments for delete to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[]));

create policy teams_select_member on public.teams for select to authenticated using (company_id = any (public.current_company_id_array()));
create policy teams_insert_manager on public.teams for insert to authenticated with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy teams_update_manager on public.teams for update to authenticated using (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[])) with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy teams_delete_admin on public.teams for delete to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[]));

create policy team_members_select_member on public.team_members for select to authenticated using (exists (select 1 from public.teams t where t.id = team_members.team_id and t.company_id = any (public.current_company_id_array())));
create policy team_members_insert_manager on public.team_members for insert to authenticated with check (exists (select 1 from public.teams t where t.id = team_members.team_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));
create policy team_members_update_manager on public.team_members for update to authenticated using (exists (select 1 from public.teams t where t.id = team_members.team_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[]))) with check (exists (select 1 from public.teams t where t.id = team_members.team_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));
create policy team_members_delete_manager on public.team_members for delete to authenticated using (exists (select 1 from public.teams t where t.id = team_members.team_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));

/* ---------- support ---------- */
create policy ticket_categories_select_member on public.ticket_categories for select to authenticated using (company_id = any (public.current_company_id_array()));
create policy ticket_categories_insert_manager on public.ticket_categories for insert to authenticated with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy ticket_categories_update_manager on public.ticket_categories for update to authenticated using (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[])) with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy ticket_categories_delete_admin on public.ticket_categories for delete to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[]));

create policy tickets_select_member on public.tickets for select to authenticated using (company_id = any (public.current_company_id_array()));
create policy tickets_insert_member on public.tickets for insert to authenticated with check (company_id = any (public.current_company_id_array()) and created_by = auth.uid() and (requester_id is null or requester_id = auth.uid() or private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[])));
create policy tickets_update_manager on public.tickets for update to authenticated using (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[])) with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy tickets_update_requester on public.tickets for update to authenticated using (requester_id = auth.uid() and status not in ('resolved','closed')) with check (requester_id = auth.uid() and company_id = any (public.current_company_id_array()));
create policy tickets_delete_admin on public.tickets for delete to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[]));

create policy ticket_assignments_select_member on public.ticket_assignments for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_assignments.ticket_id and t.company_id = any (public.current_company_id_array())));
create policy ticket_assignments_insert_manager on public.ticket_assignments for insert to authenticated with check (exists (select 1 from public.tickets t where t.id = ticket_assignments.ticket_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));
create policy ticket_assignments_update_manager on public.ticket_assignments for update to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_assignments.ticket_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[]))) with check (exists (select 1 from public.tickets t where t.id = ticket_assignments.ticket_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));
create policy ticket_assignments_delete_manager on public.ticket_assignments for delete to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_assignments.ticket_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));

create policy ticket_comments_select_member on public.ticket_comments for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id and t.company_id = any (public.current_company_id_array())));
create policy ticket_comments_insert_member on public.ticket_comments for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id and t.company_id = any (public.current_company_id_array())));
create policy ticket_comments_update_author_or_manager on public.ticket_comments for update to authenticated using (author_id = auth.uid() or exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[]))) with check (author_id = auth.uid() or exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));
create policy ticket_comments_delete_author_or_admin on public.ticket_comments for delete to authenticated using (author_id = auth.uid() or exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id and private.has_company_role(t.company_id, array['admin']::public.membership_role[])));

create policy ticket_attachments_select_member on public.ticket_attachments for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_attachments.ticket_id and t.company_id = any (public.current_company_id_array())));
create policy ticket_attachments_insert_member on public.ticket_attachments for insert to authenticated with check (uploaded_by = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_attachments.ticket_id and t.company_id = any (public.current_company_id_array())));
create policy ticket_attachments_delete_uploader_or_manager on public.ticket_attachments for delete to authenticated using (uploaded_by = auth.uid() or exists (select 1 from public.tickets t where t.id = ticket_attachments.ticket_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));

create policy ticket_status_history_select_member on public.ticket_status_history for select to authenticated using (exists (select 1 from public.tickets t where t.id = ticket_status_history.ticket_id and t.company_id = any (public.current_company_id_array())));
create policy ticket_status_history_insert_manager on public.ticket_status_history for insert to authenticated with check (changed_by = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_status_history.ticket_id and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])));

/* ---------- assets ---------- */
create policy assets_select_member on public.assets for select to authenticated using (company_id = any (public.current_company_id_array()));
create policy assets_insert_manager on public.assets for insert to authenticated with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy assets_update_manager on public.assets for update to authenticated using (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[])) with check (private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[]));
create policy assets_delete_admin on public.assets for delete to authenticated using (private.has_company_role(company_id, array['admin']::public.membership_role[]));

create policy asset_assignments_select_member on public.asset_assignments for select to authenticated using (exists (select 1 from public.assets a where a.id=asset_assignments.asset_id and a.company_id=any(public.current_company_id_array())));
create policy asset_assignments_insert_manager on public.asset_assignments for insert to authenticated with check (assigned_by=auth.uid() and exists (select 1 from public.assets a where a.id=asset_assignments.asset_id and private.has_company_role(a.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy asset_assignments_update_manager on public.asset_assignments for update to authenticated using (exists (select 1 from public.assets a where a.id=asset_assignments.asset_id and private.has_company_role(a.company_id,array['admin','hr','manager']::public.membership_role[]))) with check (exists (select 1 from public.assets a where a.id=asset_assignments.asset_id and private.has_company_role(a.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy asset_assignments_delete_manager on public.asset_assignments for delete to authenticated using (exists (select 1 from public.assets a where a.id=asset_assignments.asset_id and private.has_company_role(a.company_id,array['admin','hr','manager']::public.membership_role[])));

create policy asset_history_select_member on public.asset_history for select to authenticated using (exists (select 1 from public.assets a where a.id=asset_history.asset_id and a.company_id=any(public.current_company_id_array())));
create policy asset_history_insert_manager on public.asset_history for insert to authenticated with check (actor_id=auth.uid() and exists (select 1 from public.assets a where a.id=asset_history.asset_id and private.has_company_role(a.company_id,array['admin','hr','manager']::public.membership_role[])));

create policy asset_tickets_select_member on public.asset_tickets for select to authenticated using (exists (select 1 from public.assets a join public.tickets t on t.id=asset_tickets.ticket_id where a.id=asset_tickets.asset_id and a.company_id=any(public.current_company_id_array()) and t.company_id=a.company_id));
create policy asset_tickets_insert_manager on public.asset_tickets for insert to authenticated with check (exists (select 1 from public.assets a join public.tickets t on t.id=asset_tickets.ticket_id where a.id=asset_tickets.asset_id and a.company_id=t.company_id and private.has_company_role(a.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy asset_tickets_delete_manager on public.asset_tickets for delete to authenticated using (exists (select 1 from public.assets a join public.tickets t on t.id=asset_tickets.ticket_id where a.id=asset_tickets.asset_id and a.company_id=t.company_id and private.has_company_role(a.company_id,array['admin','hr','manager']::public.membership_role[])));

/* ---------- communications ---------- */
create policy team_messages_select_team_member on public.team_messages for select to authenticated using (exists (select 1 from public.team_members tm where tm.team_id=team_messages.team_id and tm.user_id=auth.uid()) or exists (select 1 from public.teams t where t.id=team_messages.team_id and private.has_company_role(t.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy team_messages_insert_team_member on public.team_messages for insert to authenticated with check (author_id=auth.uid() and (exists (select 1 from public.team_members tm where tm.team_id=team_messages.team_id and tm.user_id=auth.uid()) or exists (select 1 from public.teams t where t.id=team_messages.team_id and private.has_company_role(t.company_id,array['admin','hr','manager']::public.membership_role[]))));
create policy team_messages_update_author_or_manager on public.team_messages for update to authenticated using (author_id=auth.uid() or exists (select 1 from public.teams t where t.id=team_messages.team_id and private.has_company_role(t.company_id,array['admin','hr','manager']::public.membership_role[]))) with check (author_id=auth.uid() or exists (select 1 from public.teams t where t.id=team_messages.team_id and private.has_company_role(t.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy team_messages_delete_author_or_admin on public.team_messages for delete to authenticated using (author_id=auth.uid() or exists (select 1 from public.teams t where t.id=team_messages.team_id and private.has_company_role(t.company_id,array['admin']::public.membership_role[])));

create policy message_reactions_select_team_member on public.message_reactions for select to authenticated using (exists (select 1 from public.team_messages m join public.team_members tm on tm.team_id=m.team_id where m.id=message_reactions.message_id and tm.user_id=auth.uid()));
create policy message_reactions_insert_self on public.message_reactions for insert to authenticated with check (user_id=auth.uid() and exists (select 1 from public.team_messages m join public.team_members tm on tm.team_id=m.team_id where m.id=message_reactions.message_id and tm.user_id=auth.uid()));
create policy message_reactions_delete_self on public.message_reactions for delete to authenticated using (user_id=auth.uid());

create policy message_reads_select_self on public.message_reads for select to authenticated using (user_id=auth.uid());
create policy message_reads_insert_self on public.message_reads for insert to authenticated with check (user_id=auth.uid() and exists (select 1 from public.team_messages m join public.team_members tm on tm.team_id=m.team_id where m.id=message_reads.message_id and tm.user_id=auth.uid()));
create policy message_reads_update_self on public.message_reads for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy video_calls_select_member on public.video_calls for select to authenticated using (company_id=any(public.current_company_id_array()));
create policy video_calls_insert_manager on public.video_calls for insert to authenticated with check (created_by=auth.uid() and private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[]));
create policy video_calls_update_creator_or_manager on public.video_calls for update to authenticated using (created_by=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[])) with check (created_by=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[]));
create policy video_calls_delete_creator_or_admin on public.video_calls for delete to authenticated using (created_by=auth.uid() or private.has_company_role(company_id,array['admin']::public.membership_role[]));

create policy call_participants_select_member on public.call_participants for select to authenticated using (exists (select 1 from public.video_calls c where c.id=call_participants.call_id and c.company_id=any(public.current_company_id_array())));
create policy call_participants_insert_self_or_manager on public.call_participants for insert to authenticated with check (user_id=auth.uid() or exists (select 1 from public.video_calls c where c.id=call_participants.call_id and private.has_company_role(c.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy call_participants_update_self_or_manager on public.call_participants for update to authenticated using (user_id=auth.uid() or exists (select 1 from public.video_calls c where c.id=call_participants.call_id and private.has_company_role(c.company_id,array['admin','hr','manager']::public.membership_role[]))) with check (user_id=auth.uid() or exists (select 1 from public.video_calls c where c.id=call_participants.call_id and private.has_company_role(c.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy call_participants_delete_manager on public.call_participants for delete to authenticated using (exists (select 1 from public.video_calls c where c.id=call_participants.call_id and private.has_company_role(c.company_id,array['admin','hr','manager']::public.membership_role[])));

create policy call_recordings_select_member on public.call_recordings for select to authenticated using (exists (select 1 from public.video_calls c where c.id=call_recordings.call_id and c.company_id=any(public.current_company_id_array())));
create policy call_recordings_insert_creator_or_manager on public.call_recordings for insert to authenticated with check (created_by=auth.uid() and exists (select 1 from public.video_calls c where c.id=call_recordings.call_id and (c.created_by=auth.uid() or private.has_company_role(c.company_id,array['admin','hr','manager']::public.membership_role[]))));
create policy call_recordings_delete_creator_or_admin on public.call_recordings for delete to authenticated using (created_by=auth.uid() or exists (select 1 from public.video_calls c where c.id=call_recordings.call_id and private.has_company_role(c.company_id,array['admin']::public.membership_role[])));

/* ---------- workspace ---------- */
create policy workspace_folders_select_member on public.workspace_folders for select to authenticated using (company_id=any(public.current_company_id_array()));
create policy workspace_folders_insert_member on public.workspace_folders for insert to authenticated with check (created_by=auth.uid() and company_id=any(public.current_company_id_array()));
create policy workspace_folders_update_creator_or_manager on public.workspace_folders for update to authenticated using (created_by=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[])) with check (created_by=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[]));
create policy workspace_folders_delete_creator_or_admin on public.workspace_folders for delete to authenticated using (created_by=auth.uid() or private.has_company_role(company_id,array['admin']::public.membership_role[]));

create policy workspace_files_select_member on public.workspace_files for select to authenticated using (company_id=any(public.current_company_id_array()));
create policy workspace_files_insert_member on public.workspace_files for insert to authenticated with check (created_by=auth.uid() and company_id=any(public.current_company_id_array()));
create policy workspace_files_update_creator_or_manager on public.workspace_files for update to authenticated using (created_by=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[])) with check (created_by=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[]));
create policy workspace_files_delete_creator_or_admin on public.workspace_files for delete to authenticated using (created_by=auth.uid() or private.has_company_role(company_id,array['admin']::public.membership_role[]));

create policy workspace_file_versions_select_member on public.workspace_file_versions for select to authenticated using (exists (select 1 from public.workspace_files f where f.id=workspace_file_versions.file_id and f.company_id=any(public.current_company_id_array())));
create policy workspace_file_versions_insert_creator_or_manager on public.workspace_file_versions for insert to authenticated with check (created_by=auth.uid() and exists (select 1 from public.workspace_files f where f.id=workspace_file_versions.file_id and (f.created_by=auth.uid() or private.has_company_role(f.company_id,array['admin','hr','manager']::public.membership_role[]))));
create policy workspace_file_versions_delete_creator_or_admin on public.workspace_file_versions for delete to authenticated using (created_by=auth.uid() or exists (select 1 from public.workspace_files f where f.id=workspace_file_versions.file_id and private.has_company_role(f.company_id,array['admin']::public.membership_role[])));

create policy workspace_shares_select_member on public.workspace_shares for select to authenticated using (exists (select 1 from public.workspace_files f where f.id=workspace_shares.file_id and f.company_id=any(public.current_company_id_array())) and (user_id=auth.uid() or exists (select 1 from public.workspace_files f where f.id=workspace_shares.file_id and (f.created_by=auth.uid() or private.has_company_role(f.company_id,array['admin','hr','manager']::public.membership_role[])))));
create policy workspace_shares_insert_owner_or_manager on public.workspace_shares for insert to authenticated with check (created_by=auth.uid() and exists (select 1 from public.workspace_files f where f.id=workspace_shares.file_id and (f.created_by=auth.uid() or private.has_company_role(f.company_id,array['admin','hr','manager']::public.membership_role[]))));
create policy workspace_shares_delete_owner_or_manager on public.workspace_shares for delete to authenticated using (created_by=auth.uid() or exists (select 1 from public.workspace_files f where f.id=workspace_shares.file_id and private.has_company_role(f.company_id,array['admin','hr','manager']::public.membership_role[])));

create policy workspace_favorites_select_own on public.workspace_favorites for select to authenticated using (user_id=auth.uid() and exists (select 1 from public.workspace_files f where f.id=workspace_favorites.file_id and f.company_id=any(public.current_company_id_array())));
create policy workspace_favorites_insert_own on public.workspace_favorites for insert to authenticated with check (user_id=auth.uid() and exists (select 1 from public.workspace_files f where f.id=workspace_favorites.file_id and f.company_id=any(public.current_company_id_array())));
create policy workspace_favorites_delete_own on public.workspace_favorites for delete to authenticated using (user_id=auth.uid());

/* ---------- notifications ---------- */
create policy notifications_select_own on public.notifications for select to authenticated using (recipient_id=auth.uid() and company_id=any(public.current_company_id_array()));
create policy notifications_update_own on public.notifications for update to authenticated using (recipient_id=auth.uid() and company_id=any(public.current_company_id_array())) with check (recipient_id=auth.uid() and company_id=any(public.current_company_id_array()));
create policy notification_preferences_select_own on public.notification_preferences for select to authenticated using (user_id=auth.uid());
create policy notification_preferences_insert_own on public.notification_preferences for insert to authenticated with check (user_id=auth.uid());
create policy notification_preferences_update_own on public.notification_preferences for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy notification_preferences_delete_own on public.notification_preferences for delete to authenticated using (user_id=auth.uid());
create policy notification_devices_select_own on public.notification_devices for select to authenticated using (user_id=auth.uid());
create policy notification_devices_insert_own on public.notification_devices for insert to authenticated with check (user_id=auth.uid());
create policy notification_devices_update_own on public.notification_devices for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy notification_devices_delete_own on public.notification_devices for delete to authenticated using (user_id=auth.uid());
create policy notification_deliveries_select_own on public.notification_deliveries for select to authenticated using (exists (select 1 from public.notifications n where n.id=notification_deliveries.notification_id and n.recipient_id=auth.uid()));

/* ---------- attendance / QR ---------- */
create policy attendance_select_member on public.attendance for select to authenticated using (company_id=any(public.current_company_id_array()));
create policy attendance_insert_self_or_manager on public.attendance for insert to authenticated with check (company_id=any(public.current_company_id_array()) and (user_id=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[])));
create policy attendance_update_self_or_manager on public.attendance for update to authenticated using (user_id=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[])) with check (company_id=any(public.current_company_id_array()) and (user_id=auth.uid() or private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[])));
create policy attendance_delete_admin on public.attendance for delete to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[]));

create policy qr_codes_select_member on public.qr_codes for select to authenticated using (company_id=any(public.current_company_id_array()));
create policy qr_codes_insert_manager on public.qr_codes for insert to authenticated with check (created_by=auth.uid() and private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[]));
create policy qr_codes_update_manager on public.qr_codes for update to authenticated using (private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[])) with check (private.has_company_role(company_id,array['admin','hr','manager']::public.membership_role[]));
create policy qr_codes_delete_admin on public.qr_codes for delete to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[]));

create policy qr_restrictions_select_member on public.qr_restrictions for select to authenticated using (exists (select 1 from public.qr_codes q where q.id=qr_restrictions.qr_code_id and q.company_id=any(public.current_company_id_array())));
create policy qr_restrictions_insert_manager on public.qr_restrictions for insert to authenticated with check (exists (select 1 from public.qr_codes q where q.id=qr_restrictions.qr_code_id and private.has_company_role(q.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy qr_restrictions_update_manager on public.qr_restrictions for update to authenticated using (exists (select 1 from public.qr_codes q where q.id=qr_restrictions.qr_code_id and private.has_company_role(q.company_id,array['admin','hr','manager']::public.membership_role[]))) with check (exists (select 1 from public.qr_codes q where q.id=qr_restrictions.qr_code_id and private.has_company_role(q.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy qr_restrictions_delete_manager on public.qr_restrictions for delete to authenticated using (exists (select 1 from public.qr_codes q where q.id=qr_restrictions.qr_code_id and private.has_company_role(q.company_id,array['admin','hr','manager']::public.membership_role[])));

create policy qr_scan_logs_select_manager on public.qr_scan_logs for select to authenticated using (exists (select 1 from public.qr_codes q where q.id=qr_scan_logs.qr_code_id and private.has_company_role(q.company_id,array['admin','hr','manager']::public.membership_role[])));
create policy qr_scan_logs_insert_self on public.qr_scan_logs for insert to authenticated with check (user_id=auth.uid() and exists (select 1 from public.qr_codes q where q.id=qr_scan_logs.qr_code_id and q.company_id=any(public.current_company_id_array())));

/* ---------- billing ---------- */
create policy subscriptions_select_admin on public.subscriptions for select to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[]));
create policy subscriptions_insert_admin on public.subscriptions for insert to authenticated with check (private.has_company_role(company_id,array['admin']::public.membership_role[]));
create policy subscriptions_update_admin on public.subscriptions for update to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[])) with check (private.has_company_role(company_id,array['admin']::public.membership_role[]));
create policy subscriptions_delete_admin on public.subscriptions for delete to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[]));
create policy subscription_events_select_admin on public.subscription_events for select to authenticated using (exists (select 1 from public.subscriptions s where s.id=subscription_events.subscription_id and private.has_company_role(s.company_id,array['admin']::public.membership_role[])));
create policy payments_select_admin on public.payments for select to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[]));
create policy payments_insert_admin on public.payments for insert to authenticated with check (private.has_company_role(company_id,array['admin']::public.membership_role[]));
create policy payments_update_admin on public.payments for update to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[])) with check (private.has_company_role(company_id,array['admin']::public.membership_role[]));
create policy payments_delete_admin on public.payments for delete to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[]));

/* ---------- audit ---------- */
create policy audit_logs_select_admin on public.audit_logs for select to authenticated using (private.has_company_role(company_id,array['admin']::public.membership_role[]));

/* Every public application table remains protected by RLS. */
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
alter table public.company_settings enable row level security;
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.ticket_categories enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_assignments enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_status_history enable row level security;
alter table public.assets enable row level security;
alter table public.asset_assignments enable row level security;
alter table public.asset_history enable row level security;
alter table public.asset_tickets enable row level security;
alter table public.team_messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reads enable row level security;
alter table public.video_calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_recordings enable row level security;
alter table public.workspace_folders enable row level security;
alter table public.workspace_files enable row level security;
alter table public.workspace_file_versions enable row level security;
alter table public.workspace_shares enable row level security;
alter table public.workspace_favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_devices enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.attendance enable row level security;
alter table public.qr_codes enable row level security;
alter table public.qr_restrictions enable row level security;
alter table public.qr_scan_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

comment on schema private is 'Internal security helpers. Not exposed to anonymous clients.';
comment on function private.has_company_role(uuid, public.membership_role[]) is 'Security-definer membership check used by RLS. Caller identity comes only from auth.uid().';
