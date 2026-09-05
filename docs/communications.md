# Communications

Desk-Support communications are user-ID based and company scoped.

## Identity

Every conversation member, message sender, reaction, read receipt and call participant references the canonical `profiles.id` UUID. Display names are presentation data only.

## Messaging

- Direct conversations are created through `create_direct_conversation`.
- Messages are durable rows in `messages`.
- Replies use `reply_to_id`.
- Reactions use `conversation_message_reactions`.
- Read receipts use `message_read_receipts` and per-member `last_read_at`.
- Attachments belong to messages and are stored in the private `message-attachments` bucket.
- Supabase Realtime Postgres Changes keeps open conversations synchronized.

## Calls

Calls are durable rows in `calls` with UUID participants in `call_participants_v2`.

The media path is WebRTC. Supabase Realtime Broadcast is signaling only: SDP offers/answers and ICE candidates. Audio/video bytes never pass through Postgres or Supabase Realtime.

The browser uses Google STUN by default. For reliable production connectivity across restrictive NAT/firewalls, configure a TURN service with these Vite environment variables: `VITE_TURN_URL`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL`. TURN credentials should be short-lived where the provider supports ephemeral credentials.

The current implementation is mesh-based and is appropriate for direct calls and small groups. A production SFU should be introduced before large group calls to avoid O(n²) peer connections.

Call state is persisted as `initiating`, `ringing`, `connecting`, `connected`, `ended`, `declined`, `missed`, `failed`, or `disconnected`.

## Presence

The authenticated client updates `profiles.is_online` and `last_seen_at` through `set_presence`. Realtime Presence can be added later for richer ephemeral state such as typing and active-device indicators.

## Security

All communication tables use RLS. A user must be an active member of the relevant company and conversation. Calls are accessible only to their participants. Storage paths are scoped as `<conversation_uuid>/<user_uuid>/...` and the bucket is private.
