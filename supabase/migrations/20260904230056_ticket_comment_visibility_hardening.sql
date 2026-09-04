drop policy if exists ticket_comments_insert_authorized on public.ticket_comments;
create policy ticket_comments_insert_authorized on public.ticket_comments for insert to authenticated with check(author_id=auth.uid() and private.can_view_ticket(ticket_id) and (comment_type='public'::ticket_comment_type or private.can_manage_ticket(ticket_id)));
