drop policy if exists ticket_watchers_insert_authorized on public.ticket_watchers;
create policy ticket_watchers_insert_authorized on public.ticket_watchers for insert to authenticated with check(added_by=auth.uid() and private.can_view_ticket(ticket_id) and (user_id=auth.uid() or private.can_manage_ticket(ticket_id)));
