-- Ticket RLS performance hardening and FK indexes.
-- auth.uid() is evaluated once per statement through a scalar init plan.

create index if not exists idx_ticket_attachments_ticket_comment
  on public.ticket_attachments(ticket_id, comment_id);
create index if not exists idx_ticket_sla_policies_category
  on public.ticket_sla_policies(category_id)
  where category_id is not null;
create index if not exists idx_ticket_sla_policies_department
  on public.ticket_sla_policies(department_id)
  where department_id is not null;

drop policy if exists tickets_insert_member on public.tickets;
create policy tickets_insert_member on public.tickets
for insert to authenticated
with check (
  company_id = any (public.current_company_id_array())
  and created_by = (select auth.uid())
  and (
    requester_id is null
    or requester_id = (select auth.uid())
    or private.has_company_role(company_id, array['admin','hr','manager']::public.membership_role[])
  )
);

drop policy if exists tickets_update_authorized on public.tickets;
create policy tickets_update_authorized on public.tickets
for update to authenticated
using (
  private.can_manage_ticket(id)
  or (
    requester_id = (select auth.uid())
    and status <> all (array['resolved','closed']::public.ticket_status[])
  )
)
with check (company_id = any (public.current_company_id_array()));

drop policy if exists ticket_comments_delete_author_or_admin on public.ticket_comments;
create policy ticket_comments_delete_author_or_admin on public.ticket_comments
for delete to authenticated
using (
  author_id = (select auth.uid())
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_comments.ticket_id
      and private.has_company_role(t.company_id, array['admin']::public.membership_role[])
  )
);

drop policy if exists ticket_comments_insert_authorized on public.ticket_comments;
create policy ticket_comments_insert_authorized on public.ticket_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and private.can_view_ticket(ticket_id)
  and (
    comment_type = 'public'::public.ticket_comment_type
    or private.can_manage_ticket(ticket_id)
  )
);

drop policy if exists ticket_comments_update_author_or_manager on public.ticket_comments;
create policy ticket_comments_update_author_or_manager on public.ticket_comments
for update to authenticated
using (
  author_id = (select auth.uid())
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_comments.ticket_id
      and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])
  )
)
with check (
  author_id = (select auth.uid())
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_comments.ticket_id
      and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])
  )
);

drop policy if exists ticket_attachments_delete_uploader_or_manager on public.ticket_attachments;
create policy ticket_attachments_delete_uploader_or_manager on public.ticket_attachments
for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_attachments.ticket_id
      and private.has_company_role(t.company_id, array['admin','hr','manager']::public.membership_role[])
  )
);

drop policy if exists ticket_status_history_insert_authorized on public.ticket_status_history;
create policy ticket_status_history_insert_authorized on public.ticket_status_history
for insert to authenticated
with check (
  changed_by = (select auth.uid())
  and private.can_manage_ticket(ticket_id)
);

drop policy if exists ticket_resolutions_insert_authorized on public.ticket_resolutions;
create policy ticket_resolutions_insert_authorized on public.ticket_resolutions
for insert to authenticated
with check (
  resolved_by = (select auth.uid())
  and private.can_manage_ticket(ticket_id)
);

drop policy if exists ticket_escalations_insert_authorized on public.ticket_escalations;
create policy ticket_escalations_insert_authorized on public.ticket_escalations
for insert to authenticated
with check (
  escalated_by = (select auth.uid())
  and private.can_manage_ticket(ticket_id)
);

drop policy if exists ticket_watchers_delete_authorized on public.ticket_watchers;
create policy ticket_watchers_delete_authorized on public.ticket_watchers
for delete to authenticated
using (
  user_id = (select auth.uid())
  or private.has_company_role(
    (select t.company_id from public.tickets t where t.id = ticket_watchers.ticket_id),
    array['admin','hr','manager']::public.membership_role[]
  )
);

drop policy if exists ticket_watchers_insert_authorized on public.ticket_watchers;
create policy ticket_watchers_insert_authorized on public.ticket_watchers
for insert to authenticated
with check (
  added_by = (select auth.uid())
  and private.can_view_ticket(ticket_id)
  and (
    user_id = (select auth.uid())
    or private.can_manage_ticket(ticket_id)
  )
);
