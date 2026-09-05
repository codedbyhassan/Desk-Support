# Phase 3 — Domain Correctness

Date: 2026-09-05

## Implemented

### Tickets
- Added `search_tickets()` as the canonical tenant-scoped server-side filtering/pagination operation.
- Filters are applied before the cursor page is selected.
- Added cursor pagination using `(created_at,id)` ordering.
- `useTickets` now consumes the RPC and exposes `loadNextPage`/`hasMore`.
- Ticket realtime events patch local state for INSERT/UPDATE/DELETE instead of reloading the entire relationship graph.
- Removed the deprecated `ticket-workflow` Edge Function; ticket state changes use the existing atomic RPCs.
- Replaced the alphabetical trigger-order dependency between category routing and SLA selection with `route_then_apply_ticket_sla`.

### Assets
- Added an additive constraint-hygiene migration removing the named duplicate checks and replacing them with one nonblank-name, one nonblank-tag, and one warranty-date rule.

### Users / Profiles
- User management navigation now uses username instead of membership UUID.
- User detail resolves username -> profile -> company membership.
- User profile CRUD now includes username, full name, phone, role and department through the server-side provisioning operation.
- Profile avatar paths are resolved through the private `profile-images` bucket; the existing auth layer already centralizes signed avatar URL resolution.
- Added `AuthorizationSync`, which refreshes authorization when a membership changes and signs the user out if the membership is revoked.

### Teams
- Added database triggers that create/maintain a canonical `team` conversation and synchronize `team_members` into `conversation_members`.
- Removed conversation members that leave the team, preventing stale messaging membership.

### Communications
- Added `client_message_id` and `delivery_status` to messages.
- Added a unique partial index per conversation for client message IDs.
- Message sends use an idempotent upsert and retry transient failures.
- Failed sends are represented locally as `delivery_status=failed` rather than silently disappearing.
- Attachment uploads retry before a message is created and clean up the object if message/attachment persistence fails.
- Read receipts are upserted and reconciled through realtime updates.

### Attendance
- Added canonical `attendance_sessions` preserving multiple work/break sessions per day.
- Existing daily attendance rows with a check-in are copied into the session ledger without destructive deletion.
- `useAttendance` no longer exposes fabricated `on_break` state and no longer writes to the single daily row.
- User attendance management now reads the session ledger and explicitly shows `No attendance sessions yet` when empty.

### QR
- Added transactional `scan_attendance_qr()` covering membership, QR validity/expiry, configured role/location restrictions, session mutation and scan logging.
- `scan-qr` now delegates to that operation rather than merely inserting a scan log.
- Removed fabricated QR configuration fields from `useAttendance`.
- QR scanner statistics are now derived from actual session data; fake hard-coded attendance numbers were removed.

### Workspace
- Existing workspace upload/download functions were already restricted to the `workspace` bucket and company-prefixed paths.
- The Phase 3 migration creates the private `workspace` bucket explicitly.

### Notifications
- Added a delete policy matching the UI's own-notification delete action.
- `notification-worker` now processes pending push deliveries using Web Push/VAPID, records success/failure and removes expired subscriptions.
- `send-push` no longer returns device tokens to callers.

### Billing
- Provider-managed subscriptions can no longer be locally flipped by `billing-action`; provider-backed cancellation/resume must arrive through the signed provider lifecycle.
- Added `company_entitlements` and `can_use_feature()`.
- Added `plan_feature_entitlements` and synchronization from active/trial subscription plan to company entitlements.

## Deferred / external verification

The connected Supabase management interface currently returns `MCP error -32600: You do not have permission to perform this action` for migration/database operations. Consequently the new migrations and Edge Functions could be committed to GitHub but could not be applied to the live project or exercised with real production data in this pass.

This means the following must be run once Supabase management access is restored:

1. Apply the Phase 3 migrations in timestamp order.
2. Validate existing attendance rows before retiring the legacy daily model/compatibility column.
3. Run negative and positive QR scans with real accounts.
4. Create a ticket outside the first page and verify server-side assignee/search filtering finds it.
5. Verify realtime ticket INSERT/UPDATE/DELETE patching.
6. Send duplicate messages with the same client ID and verify only one message exists.
7. Force an attachment upload failure and verify retry/cleanup.
8. Verify read receipts from two authenticated clients.
9. Exercise team membership changes and verify conversation membership.
10. Exercise provider webhook -> subscription -> entitlement lifecycle.
11. Configure VAPID secrets and process a real push delivery.
12. Validate the asset constraints against existing rows before constraint validation.

These are execution/verification blockers, not reasons to fabricate a successful test result.
