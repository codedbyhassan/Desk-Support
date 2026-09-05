drop policy if exists communications_webrtc_broadcast_read on realtime.messages;
drop policy if exists communications_webrtc_broadcast_write on realtime.messages;
create policy communications_webrtc_broadcast_read on realtime.messages for select to authenticated using(extension='broadcast' and realtime.topic() like 'webrtc:%' and exists(select 1 from public.call_participants_v2 p where p.call_id=substring(realtime.topic() from 8)::uuid and p.user_id=(select auth.uid())));
create policy communications_webrtc_broadcast_write on realtime.messages for insert to authenticated with check(extension='broadcast' and realtime.topic() like 'webrtc:%' and exists(select 1 from public.call_participants_v2 p where p.call_id=substring(realtime.topic() from 8)::uuid and p.user_id=(select auth.uid())));
