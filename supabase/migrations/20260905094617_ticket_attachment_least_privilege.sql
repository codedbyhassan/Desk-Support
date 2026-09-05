-- Attachment metadata is append/remove/read data from the client.
-- No UI operation updates attachment metadata in place, so remove UPDATE privilege.
revoke update on table public.ticket_attachments from authenticated;
revoke all on table public.ticket_attachments from anon;
grant select, insert, delete on table public.ticket_attachments to authenticated;
