# Phase 5 — Production Hardening

## Architecture decision — one user, one company

Desk-Support commits to **one active company per user**. The existing application state model (`user.company_id`, company-scoped permissions and workspace settings) is the canonical model. Production now enforces this with `company_memberships(user_id)` uniqueness, so the UI cannot silently operate in an unsupported second company context.

## Completed hardening

- Added atomic fixed-window rate limiting with `rate_limit_buckets` / `consume_rate_limit()`.
- Applied rate limits to QR scans, billing actions, invitations, notification-worker execution and global search.
- Added operational event storage for structured event/latency/error reporting.
- Payment webhook replay protection remains keyed by provider event ID / `subscription_events`.
- Notification delivery now atomically claims pending work before sending, preventing two workers from sending the same pending row concurrently.
- Added expiring, session-based presence heartbeats. Browser tabs heartbeat every 30 seconds and stale profiles are reconciled.
- Added audit mutation triggers for memberships, tickets, assets, companies, company settings and subscriptions; a live company-settings mutation produced an audit record during verification.
- Added missing foreign-key indexes and fixed the identified RLS init-plan policies.
- Removed public execute access from trigger-only security-definer functions and restricted critical RPC execution to signed-in users.
- Hardened Electron navigation, sandboxing, context isolation, Node integration, web security and production DevTools behavior.
- Retired the live legacy `ticket-workflow` Edge Function with an explicit 410 response so the old path cannot perform mutations.
- Replaced the legacy `react-hot-toast` authentication dependency with the canonical application toaster.
- Deployed the updated QR, billing, invitation and notification-worker Edge Functions to the connected Desk-Support project.

## Induced verification performed

- Rate limiter: three sequential calls against a two-request window returned `true`, `true`, `false`; the test bucket was then removed.
- Presence reconciliation: `cleanup_presence()` cleared one stale online profile in the live database.
- Audit: a live company-settings mutation generated a `phase5_mutation_trigger` audit record.
- Production database is `ACTIVE_HEALTHY` on PostgreSQL 17.6.1.166.
- Live Edge Function inventory was checked after deployments.
- Security and performance advisors were run after the DDL changes; remaining notices are primarily existing/unused-index recommendations and provider configuration items.

## External/platform verification still required before public launch

These cannot honestly be simulated inside the repository/database connector and therefore are **not claimed as passed**:

1. TURN/WebRTC failure testing across real NAT/firewall networks. STUN-only operation is not production-grade; configure TURN before public calls and use an SFU if calls will exceed four participants.
2. Browser-driven realtime disconnect/reconnect and multi-tab call testing requires a real browser/device session.
3. Supabase backup retention/frequency and an actual restore rehearsal must be verified in the Supabase project/isolated environment; the available project API does not expose the backup/restore plan settings.
4. Android/iOS native permission, icon, splash, push and WebRTC testing requires generated native projects and physical/emulated devices.
5. Production secret configuration such as VAPID keys and payment webhook secrets must be verified in the deployment environment. The notification worker correctly fails visibly with 503 when VAPID configuration is absent.
6. Full infrastructure-level retry/backoff and scheduled worker behavior requires the deployed scheduler/provider environment.

## Release checklist

- [x] Core Phase 5 database migrations applied.
- [x] One-company decision enforced.
- [x] Rate-limit primitive tested and integrated into high-risk paths.
- [x] Webhook event replay guard present.
- [x] Notification delivery claim/idempotency guard deployed.
- [x] Presence expiry/reconciliation deployed and invoked successfully.
- [x] Audit mutation coverage tested.
- [x] Security/performance advisors rerun.
- [x] Electron security defaults hardened.
- [x] Legacy ticket-workflow live path retired.
- [ ] TURN configured and real network call test.
- [ ] Browser realtime disconnect/reconnect test.
- [ ] Backup configuration and restore rehearsal.
- [ ] Android/iOS native smoke tests.
- [ ] Production VAPID/payment/provider secrets verified.

## Phase 5 conclusion

The repository and connected Supabase database now contain the production-hardening foundations that can be implemented without pretending that unavailable physical devices, TURN infrastructure, browser automation, or backup controls were tested. The remaining checklist items are explicit deployment/provider/device gates, not hidden known defects.
