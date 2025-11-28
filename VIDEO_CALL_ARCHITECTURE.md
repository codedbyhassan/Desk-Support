# In-App Video Calling Architecture (Proposal)

This document outlines a recommended approach to implement an in-app video calling and video chat feature for Desk-Support.

Goals:
- Build an integrated video experience inside the app (no external Daily.co dependency).
- Start with a simple WebRTC P2P flow for 1:1 and small groups for quick iteration.
- Design an upgrade path to a scalable SFU (LiveKit, mediasoup, Janus) for rooms with many participants.

Core components (proposed folder structure):

- `src/services/video/` — Signaling + WebRTC helpers
  - `signaling.ts` — WebSocket client to exchange SDP/ICE messages
  - `webrtc.ts` — Helpers for peer connections, TURN config, getUserMedia

- `src/hooks/useVideoCall.tsx` — React hook that manages local/remote streams and peers
- `src/components/teams/VideoCallView.tsx` — UI for the call (local + remote video elements, controls)
- `src/pages/CallPage.tsx` — Optional dedicated route for the call experience

Design decisions & rationale

1) Signaling
- Use a lightweight WebSocket signaling server to exchange SDP/ICE messages.
- Alternatives: Supabase Realtime (channels), or a simple Node/Express + ws server.

2) Media transport
- For quick MVP/1:1: use WebRTC P2P.
- For production/multi-user (>= 3): use an SFU (LiveKit recommended for managed service, mediasoup/self-hosted for more control).
- Always provision a TURN server (coturn) to handle NAT traversal.

3) Presence & room state
- Use Supabase (existing) for room/participant persistence and presence, or store ephemeral state in the signaling server for faster updates.

4) Security
- Require authenticated users to join rooms; issue ephemeral tokens for the SFU or signaling channel where appropriate.
- Validate access on server side (room membership, company/team checks).

5) Recording & moderation (optional)
- Offload to server-side recording via SFU integration, or capture via MediaRecorder on client for simple cases.

Migration path from P2P → SFU
1. Start with P2P implementation for fast delivery.
2. Add TURN server and robust signaling.
3. Introduce an SFU for rooms with > 3 participants and switch clients to connect via SFU (server issues room token/URL).

Minimum Viable Implementation Plan (steps)
1. Scaffold signaling (WebSocket) server and client (already added client scaffold).
2. Implement `useVideoCall` hook for local preview, join, offer/answer flows.
3. Add `VideoCallView` component and a route/page to open a call.
4. Wire up backend: simple signaling server (Node) and TURN server (coturn).
5. Test 1:1 and small group calls across NATs; add STUN/TURN config.
6. If needed, swap P2P to SFU (LiveKit or mediasoup).

Quick notes on server
- Signaling server: exchanges JSON messages { type: 'join'|'offer'|'answer'|'ice-candidate', payload }
- TURN: coturn configured with credentials stored in env (VITE_TURN_URL, VITE_TURN_USER, VITE_TURN_PASS)
- Optional: Use Supabase Edge Functions to create room tokens for SFU providers

References and recommended tech
- LiveKit (hosted or self-hosted) — excellent managed SFU with SDKs
- mediasoup — powerful self-hosted SFU
- coturn — TURN server
- WebSocket server (Node + ws) — simple signaling

Next actionable items I can do now
1. Add a lightweight signaling server example (Node + ws) in `dev-tools/` or as a snippet.
2. Wire a Call page and integrate `VideoCallView` into the Teams flow.
3. Implement joined-participant UI and mute/unmute, camera toggle.

Tell me which next step you prefer and I will implement it: add a signaling server snippet, wire VideoCallView into Teams page, or implement TURN + SFU integration guidance.
