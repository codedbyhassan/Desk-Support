# Phase 5 — Production Hardening

## Architecture decision

Desk-Support commits to **multi-company membership support**. A user may belong to more than one active company. The application must maintain an explicit active-company selection and resolve role, department, settings, tickets, assets, communications, notifications and entitlements against that company. No code may silently select the first membership.

The current database already supports multiple memberships. A company switcher and active-company persistence are therefore mandatory before production rollout.

## Operational primitives

The database contains:
- `rate_limit_buckets` and `consume_rate_limit()` for atomic fixed-window controls.
- `operational_events` for structured operational events and latency/error metadata.

These are intentionally private to service-role workers/functions. Application endpoints should use a server-side service-role boundary for abuse-sensitive operations rather than trusting client-supplied counters.

## Required endpoint controls

Apply `consume_rate_limit()` at the server boundary for:
- payment webhooks: strict per-source/IP/event window;
- invite and provisioning: per-actor and target-email limits;
- QR scans: per-user/device and QR-code limits;
- ticket search: per-user/company query limits.

Do not rate-limit by an untrusted company header alone.

## Idempotency

- Payment webhooks use the provider event ID as a unique event key and must persist the event before applying subscription state.
- Message creation uses `client_message_id` uniqueness.
- Notification delivery must claim a pending row atomically before sending and record the attempt/result.
- Background workers must use bounded exponential backoff and preserve failure state.

## Realtime

Every realtime consumer should handle `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT` and `CLOSED`. On recovery it should remove stale channels, recreate the subscription and perform a bounded state resync. The UI should expose an offline/reconnecting indicator.

## Presence

Presence is ephemeral. `is_online` must be derived from a heartbeat/session model with expiry, not treated as durable profile truth. Multiple tabs must be represented independently and a user is online while at least one valid session is alive.

## WebRTC

STUN-only calls are not production reliable. Before public rollout, configure a TURN service and inject short-lived TURN credentials. For calls above 4 participants, use an SFU architecture rather than expanding mesh peer connections.

## Storage lifecycle

Define retention by bucket, remove objects when their owning records are permanently deleted, and run a scheduled orphan scan. Enforce per-file and per-company quotas before accepting uploads.

## Audit verification

Security-critical mutations must have a corresponding audit event. Verification must cover authentication events, invites, role changes, user deactivation/removal, ticket assignment/status changes, asset assignment/retirement, company settings, and billing lifecycle changes. Audit failures must not be silently ignored.

## Backup and restore

Verify the Supabase plan's backup frequency and retention in the project dashboard. Perform a restore rehearsal into an isolated project/branch before production launch and record the restore timestamp, row-count checks, authentication/storage checks and application smoke-test result. A configuration check alone is not considered a restore test.

## Platform matrix

### Web
Camera, microphone, Web Push and WebRTC depend on secure context and browser permissions. Storage is browser-managed.

### Electron
Use `contextIsolation`, sandboxing, disabled Node integration and a controlled navigation policy. Production DevTools should remain disabled. Package signing and an update mechanism are release concerns.

### Android/iOS
Camera, microphone and notification permissions must be declared natively. Push and WebRTC require platform-specific integration; web-only service-worker push is not sufficient for native builds. Native icons/splash assets must be present in the generated platform projects.

## Release checklist

- [ ] Production environment variables reconciled with `.env.example`.
- [ ] All migrations applied and verified against production.
- [ ] Edge Functions deployed from the same commit as migrations.
- [ ] Storage buckets are private where required and policies verified.
- [ ] Rate limits verified under repeated requests.
- [ ] Webhook replay produces no duplicate state change.
- [ ] Notification worker retry/claim behavior verified.
- [ ] Realtime disconnect/reconnect tested.
- [ ] Presence stale-session expiry tested.
- [ ] TURN credentials tested from at least two network types.
- [ ] Audit events verified for every security-critical action.
- [ ] Backup configuration verified.
- [ ] Restore rehearsal completed and documented.
- [ ] Electron package smoke-tested.
- [ ] Android/iOS native permissions/assets verified.
- [ ] Monitoring dashboards checked.
- [ ] Rollback procedure rehearsed.

## Verification rule

Do not mark a hardening item complete solely from static inspection. Each item needs an induced-failure test or an explicit platform/provider limitation recorded beside the checklist item.
