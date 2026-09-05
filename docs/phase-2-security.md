# Phase 2 — Security

## Enforcement added

- `public.can_assign_role(actor_role, target_role)` defines `admin > hr > manager > employee > contractor > viewer`.
- `public.can_actor_assign_role(company_id, target_role)` resolves the caller's active membership server-side.
- `private.enforce_membership_role_change` blocks authenticated direct role escalation.
- `private.prevent_admin_lockout` blocks self-deactivation and deactivation of the last active admin.
- `private.enforce_conversation_member_mutation` blocks member-controlled role/user/conversation changes; `public.manage_conversation_member` is the privileged path.
- `private.prevent_call_lifecycle_update` separates participant departure from call termination; `public.leave_call` changes only the caller's participant row and `public.end_call` is limited to the initiator/admin.
- Tenant-aware composite foreign keys and parent composite uniqueness were added for ticket routing, assignments, notifications, attendance, audit actors, QR scans, and canonical call conversations. Child tenant IDs are derived from trusted parents by triggers.
- Membership role/status security changes generate audit records inside the database transaction.
- `invite-user` and `provision-user` now call the centralized server-side role authorization RPC before using the service-role client.
- `manage-user-status` already contains server-side self-deactivation and last-admin checks.
- `send-push` now authenticates the caller and rejects another user's `user_id`.
- `scan-qr` checks active company membership before resolving a QR code.
- `payment-webhook` now requires a signed request, timestamp freshness, idempotency, raw-event persistence, and an allow-list for subscription status transitions.

## Negative-test matrix

These tests must be executed against the target Supabase project after the migrations/functions are deployed. A successful test means the attempted escalation returns an error and the database remains unchanged.

1. **Role escalation** — authenticate as HR/manager and attempt `can_actor_assign_role(company_id,'admin')`; expected `false`. Attempt direct membership update to admin; expected RLS/trigger failure.
2. **Last admin** — with exactly one active admin, attempt to deactivate that admin; expected failure and `is_active=true` remains.
3. **Self lockout** — attempt to deactivate the current user's membership through `manage-user-status`; expected failure.
4. **Conversation role escalation** — member attempts direct update from `member` to `admin`; expected trigger failure. Owner/admin uses `manage_conversation_member`; expected success.
5. **Call lifecycle** — non-initiator participant calls `leave_call`; expected only their `call_participants_v2` row becomes `left` and `calls.status` is unchanged. Non-initiator direct update of `calls.status='ended'`; expected failure. Initiator/admin `end_call`; expected success.
6. **Webhook forgery** — POST a fake subscription status without a valid signature; expected 401 and no subscription/event mutation.
7. **Webhook replay** — resend a previously accepted event ID; expected duplicate response and no second state transition.
8. **Push device isolation** — authenticated user requests another user's `user_id`; expected rejection and no other user's token data returned.
9. **QR tenant isolation** — authenticated user from company A submits a QR code belonging to company B; expected rejection before the QR record is returned/acted upon.
10. **Tenant FK** — attempt to assign a company-A ticket to a company-B department/team or assignee; expected FK/trigger failure.
11. **Aggregate isolation** — authenticated member calls `get_company_counts(company_B)` without membership in B; expected exception.
12. **Audit integrity** — authenticated client attempts direct insert/update/delete on `audit_logs`; expected permission failure. Security-critical membership mutation should create its audit row automatically.

## Known deferred items

- Push delivery itself remains a Phase 3 concern; the current `send-push` function reports configured/queued devices rather than delivering a push.
- Expanded search coverage remains Phase 3. No `global-search` Edge Function exists in the current repository; the current command UI searches already-loaded assets/tickets rather than constructing a PostgREST `.or()` expression.
- Canonical `calls` has `conversation_id` rather than separate `team_id`, `ticket_id`, or `asset_id` columns, so Phase 2 enforces the actual canonical call parent rather than inventing new domain columns.
- Existing composite constraints are deliberately `NOT VALID` until production data is explicitly checked; they still protect new/updated rows. Run the documented validation queries and then `VALIDATE CONSTRAINT`.
- Service-role credentials cannot be rotated by the repository connector. The previously tracked service-role key must be revoked/rotated in the Supabase project settings before Phase 2 can be signed off.
- Live database migration/function deployment and the negative tests require an active Supabase management connection; the connected Supabase tool currently returns a permission-denied error for database operations.
