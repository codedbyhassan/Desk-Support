# Phase 5 — Production Hardening

## Architecture decision — one user, one company

Desk-Support commits to **one active company per user**. The existing application state model (`user.company_id`, company-scoped permissions and workspace settings) is therefore the canonical model. The database now enforces this with a unique constraint on `company_memberships.user_id`, preventing an account from silently acquiring a second company context that the UI cannot represent safely.

This deliberately favors correctness over an unfinished company switcher. If multi-company support is needed later, it must be a dedicated architecture change rather than an implicit behavior.

## Operational primitives

The database contains:
- `rate_limit_buckets` and `consume_rate_limit()` for atomic fixed-window controls.
- `operational_events` for structured operational events and latency/error metadata.

These are private to service-role workers/functions. Abuse-sensitive endpoints must enforce limits server-side rather than trusting client counters or company headers.

## Required endpoint controls

Apply `consume_rate_limit()` at the server boundary for:
- payment webhooks: strict per-source/event window;
- invite and provisioning: per-actor and target-email limits;
- QR scans: per-user/device and QR-code limits;
- ticket search: per-user/company query limits.

## Idempotency

- Payment webhooks use provider event IDs and `subscription_events` as the replay guard.
- Message creation uses `client_message_id` uniqueness.
- Notification delivery must claim a pending row atomically before sending and record attempts/results.
- Background workers must use bounded exponential backoff and preserve failure state.

## Realtime and presence

Every realtime consumer should handle subscription failure/timeout/close, recreate the channel and resync bounded state. Presence is ephemeral and should expire stale sessions rather than permanently storing `is_online=true`.

## WebRTC

STUN-only calls are not production reliable. Configure TURN before public rollout. Calls above four participants should use an SFU rather than expanding mesh connections.

## Storage lifecycle

Define retention by bucket, remove objects when their owning records are permanently deleted, run scheduled orphan cleanup and enforce file/company quotas.

## Audit verification

Security-critical mutations must have corresponding audit events. Verify login/logout, invites, role changes, deactivation/removal, ticket assignment/status, asset assignment/retirement, company settings and billing lifecycle changes. Audit failures must remain observable.

## Backup and restore

Verify the Supabase plan's backup frequency/retention in the project dashboard. Perform a restore rehearsal into an isolated environment and record row-count, authentication/storage and application smoke-test results. Configuration alone is not a restore test.

## Platform matrix

### Web
Camera, microphone, Web Push and WebRTC require browser permissions and appropriate secure-context behavior.

### Electron
Production configuration must keep Node integration disabled, context isolation and sandbox enabled, web security enabled and DevTools disabled. Navigation should be constrained to trusted application URLs.

### Android/iOS
Camera, microphone and notification permissions must be declared natively. Native push/WebRTC require native integration; web service-worker push is not a substitute. Icons and splash assets must be present in generated native projects.

## Release checklist

- [ ] Production environment variables reconciled with `.env.example`.
- [ ] Migrations applied and verified against production.
- [ ] Edge Functions deployed from the same commit as migrations.
- [ ] Storage buckets/private policies verified.
- [ ] Rate limits verified under repeated requests.
- [ ] Webhook replay produces no duplicate state change.
- [ ] Notification worker retry/claim behavior verified.
- [ ] Realtime disconnect/reconnect tested.
- [ ] Presence stale-session expiry tested.
- [ ] TURN credentials tested from multiple network types.
- [ ] Audit events verified for every security-critical action.
- [ ] Backup configuration verified.
- [ ] Restore rehearsal completed.
- [ ] Electron package smoke-tested.
- [ ] Android/iOS permissions/assets verified.
- [ ] Monitoring checked.
- [ ] Rollback procedure rehearsed.

## Verification rule

A hardening item is only complete after an induced-failure test or an explicitly recorded provider/platform limitation. Never silently swallow operational failures.
