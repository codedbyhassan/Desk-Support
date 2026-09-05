-- Ticket attachment integrity and Data API access hardening.
-- Keeps ticket files private in Supabase Storage and makes attachment metadata
-- consistently enforce the ticket/comment relationship at the database layer.

create unique index if not exists ticket_comments_ticket_id_id_key
  on public.ticket_comments(ticket_id, id);

-- Replace the weaker single-column comment FK with a composite FK so an attachment
-- cannot reference a comment belonging to a different ticket.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'ticket_attachments_comment_fk'
      and conrelid = 'public.ticket_attachments'::regclass
  ) then
    alter table public.ticket_attachments drop constraint ticket_attachments_comment_fk;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ticket_attachments_ticket_comment_fk'
      and conrelid = 'public.ticket_attachments'::regclass
  ) then
    alter table public.ticket_attachments
      add constraint ticket_attachments_ticket_comment_fk
      foreign key (ticket_id, comment_id)
      references public.ticket_comments(ticket_id, id)
      on delete set null;
  end if;
end $$;

alter table public.ticket_attachments
  drop constraint if exists ticket_attachments_file_size_check;

alter table public.ticket_attachments
  add constraint ticket_attachments_file_size_check
  check (file_size_bytes is null or (file_size_bytes >= 0 and file_size_bytes <= 5242880));

alter table public.ticket_attachments
  drop constraint if exists ticket_attachments_mime_type_check;

alter table public.ticket_attachments
  add constraint ticket_attachments_mime_type_check
  check (mime_type is null or mime_type in ('image/jpeg','image/png','image/webp','image/gif'));

alter table public.ticket_attachments
  drop constraint if exists ticket_attachments_storage_path_check;

alter table public.ticket_attachments
  add constraint ticket_attachments_storage_path_check
  check (storage_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[^/]+$');

create unique index if not exists ticket_attachments_ticket_storage_path_key
  on public.ticket_attachments(ticket_id, storage_path);

-- The metadata table must be writable by authenticated ticket participants who
-- upload their own files. Storage itself remains private and independently RLS protected.
drop policy if exists ticket_attachments_insert_member on public.ticket_attachments;
create policy ticket_attachments_insert_member
  on public.ticket_attachments
  for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and private.can_view_ticket(ticket_id)
  );

-- Ensure authenticated clients can reach the metadata table through PostgREST.
revoke all on table public.ticket_attachments from anon;
grant select, insert, delete on table public.ticket_attachments to authenticated;

comment on table public.ticket_attachments is 'Private Storage metadata for ticket images. Paths are scoped to uploader UUID and ticket UUID.';
comment on constraint ticket_attachments_ticket_comment_fk on public.ticket_attachments is 'Prevents an attachment from being associated with a comment belonging to another ticket.';
