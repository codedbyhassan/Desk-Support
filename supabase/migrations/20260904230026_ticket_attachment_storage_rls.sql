drop policy if exists "Authenticated users can upload ticket attachments" on storage.objects;
drop policy if exists "Authenticated users can view ticket attachments" on storage.objects;
drop policy if exists "Authenticated users can delete their ticket attachments" on storage.objects;
create policy "Ticket members can upload attachments" on storage.objects for insert to authenticated with check(bucket_id='ticket-attachments' and (storage.foldername(name))[1]=(select auth.uid()::text) and private.can_view_ticket(((storage.foldername(name))[2])::uuid));
create policy "Ticket members can view attachments" on storage.objects for select to authenticated using(bucket_id='ticket-attachments' and private.can_view_ticket(((storage.foldername(name))[2])::uuid));
create policy "Ticket members can delete attachments" on storage.objects for delete to authenticated using(bucket_id='ticket-attachments' and (owner_id=(select auth.uid()::text) or private.can_manage_ticket(((storage.foldername(name))[2])::uuid)));
