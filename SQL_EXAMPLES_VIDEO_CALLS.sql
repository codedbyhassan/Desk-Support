-- ============================================================================
-- VIDEO CALL SYSTEM - QUICK START SQL EXAMPLES
-- ============================================================================
-- Copy and paste these examples to test the video call system
-- ============================================================================

-- ============================================================================
-- EXAMPLE 1: Create a new video call
-- ============================================================================
INSERT INTO public.video_calls (
  team_id,
  company_id,
  room_name,
  initiated_by,
  mode,
  status
)
VALUES (
  'team-uuid-here',
  'company-uuid-here',
  'team-uuid-here-' || to_char(now(), 'YYYYMMDDHHmmss') || '-' || substr(md5(random()::text), 1, 8),
  'user-uuid-here',
  'video',
  'pending'
)
RETURNING id, room_name;

-- ============================================================================
-- EXAMPLE 2: Add user to call as participant
-- ============================================================================
INSERT INTO public.call_participants (
  call_id,
  user_id,
  peer_id
)
VALUES (
  'call-uuid-here',
  'user-uuid-here',
  'peer-' || substr(md5(random()::text), 1, 16)
)
RETURNING id, peer_id;

-- ============================================================================
-- EXAMPLE 3: Activate a call (when first participant joins)
-- ============================================================================
UPDATE public.video_calls
SET 
  status = 'active',
  started_at = timezone('utc'::text, now()),
  updated_at = timezone('utc'::text, now())
WHERE id = 'call-uuid-here'
RETURNING id, status, started_at;

-- ============================================================================
-- EXAMPLE 4: Send WebRTC offer (signaling message)
-- ============================================================================
INSERT INTO public.signaling_messages (
  call_id,
  from_peer_id,
  to_peer_id,
  message_type,
  payload
)
VALUES (
  'call-uuid-here',
  'peer-sender-id',
  'peer-recipient-id',
  'offer',
  jsonb_build_object(
    'sdp', 'v=0
o=- 123456 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1
a=extmap-allow-mixed
a=msid-semantic: WMS stream
m=audio 9 UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 106 105 13 110 112 113 114
... (full SDP string)'
  )
)
RETURNING id;

-- ============================================================================
-- EXAMPLE 5: Send ICE candidate (signaling message)
-- ============================================================================
INSERT INTO public.signaling_messages (
  call_id,
  from_peer_id,
  to_peer_id,
  message_type,
  payload
)
VALUES (
  'call-uuid-here',
  'peer-sender-id',
  'peer-recipient-id',
  'ice-candidate',
  jsonb_build_object(
    'candidate', jsonb_build_object(
      'candidate', 'candidate:842163049 1 udp 1677729535 192.168.1.100 54321 typ srflx raddr 0.0.0.0 rport 0',
      'sdpMLineIndex', 0,
      'sdpMid', '0'
    )
  )
)
RETURNING id;

-- ============================================================================
-- EXAMPLE 6: Update participant media status
-- ============================================================================
UPDATE public.call_participants
SET 
  muted_audio = true,
  updated_at = timezone('utc'::text, now())
WHERE call_id = 'call-uuid-here' AND user_id = 'user-uuid-here'
RETURNING id, muted_audio, muted_video;

-- ============================================================================
-- EXAMPLE 7: Log participant action
-- ============================================================================
INSERT INTO public.call_activity_logs (
  call_id,
  user_id,
  action,
  details
)
VALUES (
  'call-uuid-here',
  'user-uuid-here',
  'screen_share_start',
  jsonb_build_object(
    'resolution', '2560x1440',
    'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  )
)
RETURNING id, action, created_at;

-- ============================================================================
-- EXAMPLE 8: Record call statistics
-- ============================================================================
INSERT INTO public.call_statistics (
  call_id,
  participant_id,
  audio_bitrate_kbps,
  video_bitrate_kbps,
  packet_loss_percent,
  latency_ms,
  video_resolution,
  frames_per_second,
  cpu_usage_percent,
  memory_usage_mb
)
VALUES (
  'call-uuid-here',
  'participant-uuid-here',
  128,
  2500,
  0.5,
  45,
  '1280x720',
  30,
  25.5,
  450
)
RETURNING id, audio_bitrate_kbps, video_bitrate_kbps, latency_ms;

-- ============================================================================
-- EXAMPLE 9: Get all active calls in a team
-- ============================================================================
SELECT * FROM public.get_active_team_calls('team-uuid-here');

-- Expected output:
-- id | room_name | initiated_by | mode | participant_count
-- ---|-----------|--------------|------|------------------
-- ... | team-... | user-... | video | 3

-- ============================================================================
-- EXAMPLE 10: Get call with all participants
-- ============================================================================
SELECT 
  vc.id,
  vc.room_name,
  vc.mode,
  vc.status,
  vc.initiated_at,
  count(cp.id) as participant_count,
  json_agg(
    json_build_object(
      'user_id', cp.user_id,
      'joined_at', cp.joined_at,
      'peer_id', cp.peer_id,
      'muted_audio', cp.muted_audio,
      'muted_video', cp.muted_video
    )
  ) as participants
FROM public.video_calls vc
LEFT JOIN public.call_participants cp ON cp.call_id = vc.id
WHERE vc.id = 'call-uuid-here'
GROUP BY vc.id, vc.room_name, vc.mode, vc.status, vc.initiated_at;

-- ============================================================================
-- EXAMPLE 11: End a call
-- ============================================================================
SELECT public.end_video_call('call-uuid-here');

-- ============================================================================
-- EXAMPLE 12: Get pending signaling messages for a peer
-- ============================================================================
SELECT 
  id,
  from_peer_id,
  message_type,
  payload,
  created_at
FROM public.signaling_messages
WHERE 
  call_id = 'call-uuid-here'
  AND to_peer_id = 'peer-uuid-here'
  AND created_at > now() - interval '1 minute'
ORDER BY created_at ASC;

-- ============================================================================
-- EXAMPLE 13: Get call statistics for performance analysis
-- ============================================================================
SELECT * FROM public.call_stats_summary
WHERE call_id = 'call-uuid-here';

-- Expected output:
-- call_id | measurement_count | avg_audio_bitrate_kbps | avg_video_bitrate_kbps | avg_latency_ms | max_packet_loss_percent | avg_cpu_usage_percent
-- --------|-------------------|------------------------|------------------------|----------------|------------------------|--------------------

-- ============================================================================
-- EXAMPLE 14: Get call activity timeline
-- ============================================================================
SELECT 
  u.full_name,
  cal.action,
  cal.details,
  cal.created_at,
  to_char(cal.created_at, 'HH24:MI:SS') as time
FROM public.call_activity_logs cal
LEFT JOIN public.users u ON u.id = cal.user_id
WHERE cal.call_id = 'call-uuid-here'
ORDER BY cal.created_at ASC;

-- Expected output:
-- full_name | action | details | created_at | time
-- ----------|--------|---------|------------|------
-- John Doe | joined | ... | 2025-11-28 10:00:00 | 10:00:00
-- Jane Smith | joined | ... | 2025-11-28 10:00:15 | 10:00:15
-- John Doe | screen_share_start | ... | 2025-11-28 10:02:30 | 10:02:30
-- John Doe | muted_audio | ... | 2025-11-28 10:05:00 | 10:05:00

-- ============================================================================
-- EXAMPLE 15: Create call recording metadata
-- ============================================================================
INSERT INTO public.call_recordings (
  call_id,
  company_id,
  recording_url,
  storage_path,
  duration_seconds,
  file_size_bytes,
  video_codec,
  audio_codec,
  status
)
VALUES (
  'call-uuid-here',
  'company-uuid-here',
  'https://storage.supabase.co/call-recordings/...',
  'call-recordings/company-uuid/call-uuid/recording-20251128-100000.webm',
  300,
  52428800,
  'vp8',
  'opus',
  'ready'
)
RETURNING id, recording_url, duration_seconds;

-- ============================================================================
-- EXAMPLE 16: Query active calls with real-time participant data
-- ============================================================================
SELECT 
  id,
  room_name,
  team_id,
  active_participant_count,
  participants
FROM public.active_calls_with_participants
WHERE team_id = 'team-uuid-here'
ORDER BY initiated_at DESC;

-- ============================================================================
-- EXAMPLE 17: Find all calls for a specific user
-- ============================================================================
SELECT 
  vc.id,
  vc.room_name,
  vc.mode,
  vc.status,
  vc.initiated_at,
  vc.ended_at,
  extract(epoch from (vc.ended_at - vc.started_at)) as duration_seconds
FROM public.video_calls vc
JOIN public.call_participants cp ON cp.call_id = vc.id
WHERE cp.user_id = 'user-uuid-here'
ORDER BY vc.initiated_at DESC
LIMIT 50;

-- ============================================================================
-- EXAMPLE 18: Get summary stats for all calls in a team
-- ============================================================================
SELECT 
  vc.id,
  vc.room_name,
  count(distinct cp.user_id) as total_participants,
  count(distinct cp.user_id) filter (where cp.left_at is null) as active_participants,
  round(extract(epoch from (vc.ended_at - vc.started_at))/60) as duration_minutes,
  array_agg(distinct u.full_name) as participant_names
FROM public.video_calls vc
LEFT JOIN public.call_participants cp ON cp.call_id = vc.id
LEFT JOIN public.users u ON u.id = cp.user_id
WHERE vc.team_id = 'team-uuid-here'
  AND vc.initiated_at > now() - interval '7 days'
GROUP BY vc.id, vc.room_name
ORDER BY vc.initiated_at DESC;

-- ============================================================================
-- EXAMPLE 19: Get list of pending/unsent signaling messages (Debugging)
-- ============================================================================
SELECT 
  count(*) as pending_messages,
  to_peer_id,
  message_type
FROM public.signaling_messages
WHERE 
  call_id = 'call-uuid-here'
  AND created_at > now() - interval '5 minutes'
GROUP BY to_peer_id, message_type
ORDER BY to_peer_id;

-- ============================================================================
-- EXAMPLE 20: Cleanup - Mark participant as left
-- ============================================================================
UPDATE public.call_participants
SET 
  left_at = timezone('utc'::text, now()),
  updated_at = timezone('utc'::text, now())
WHERE 
  call_id = 'call-uuid-here' 
  AND user_id = 'user-uuid-here'
  AND left_at IS NULL
RETURNING id, left_at;

-- ============================================================================
-- USEFUL QUERIES FOR DEBUGGING
-- ============================================================================

-- Count active calls right now
SELECT count(*) as active_calls FROM public.video_calls WHERE status = 'active';

-- Find long-running calls (potential issues)
SELECT 
  id,
  room_name,
  initiated_at,
  now() - initiated_at as duration
FROM public.video_calls
WHERE status = 'active'
  AND (now() - initiated_at) > interval '2 hours'
ORDER BY duration DESC;

-- Find calls with connection errors
SELECT 
  vc.id,
  vc.room_name,
  count(*) as error_count,
  max(cal.created_at) as last_error
FROM public.video_calls vc
JOIN public.call_activity_logs cal ON cal.call_id = vc.id
WHERE cal.action IN ('connection_error', 'connection_restored')
GROUP BY vc.id, vc.room_name
ORDER BY error_count DESC;

-- Get average call duration
SELECT 
  avg(extract(epoch from (ended_at - started_at))/60) as avg_duration_minutes,
  count(*) as total_calls
FROM public.video_calls
WHERE status = 'ended'
  AND ended_at > now() - interval '7 days';

-- Cleanup: Remove very old signaling messages manually
-- (normally auto-cleanup via expires_at)
DELETE FROM public.signaling_messages 
WHERE created_at < now() - interval '2 hours'
RETURNING count(*) as deleted_count;

-- ============================================================================
-- END OF EXAMPLES
-- ============================================================================
