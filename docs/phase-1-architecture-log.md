# Phase 1 — Canonical Architecture Log

Date: 2026-09-05

This log records structural cleanup performed during Phase 1. It deliberately excludes security, domain-correctness, UX, and production-hardening work.

## Completed in this pass

### Canonical Supabase client
- `src/lib/supabase.ts` remains the single browser client and is now instantiated as `createClient<Database>(...)`.
- No second browser client wrapper was found in the current repository tree.
- The redundant `src/types/supabase.ts` type shim was removed.

### Canonical communications
- `TeamsPage` resolves a team to the canonical `conversations` model through `get_or_create_team_conversation`.
- `TeamChatView` uses `messages`, `conversation_members`, `message_attachments`, `conversation_message_reactions`, and `message_read_receipts` through `useCommunications`.
- The canonical team-conversation migration is present as `20260905125424_team_conversation_canonicalization.sql`.

### Canonical calling
- `CallPage` is the active call route and uses `calls`, `call_participants_v2`, Supabase Realtime broadcast, and `useWebRTCCall`.
- Legacy video-call UI/hooks were removed after checking the active router: `useVideoCall`, `useVideoChat`, `VideoCallView`, `VideoCallSettings`, `ScreenShareDisplay`, `ParticipantsList`, and the old `src/services/video/webrtc.ts` helper.
- The explicitly listed legacy signaling files/services were already absent from `main` when Phase 1 began.

### Cross-cutting systems
- `ThemeProvider` is centralized in `src/context/ThemeContext.tsx` and is the provider mounted by `App.tsx`.
- The redundant theme-provider hook was absent when its removal was attempted; no active import was found.
- Toast is standardized on the existing shadcn-style `use-toast` + `Toaster` path. `react-hot-toast` and `sonner` are not present in `package.json`.

### Root/dependency/config cleanup already present
- `.stylelintrc.json` already exists and contains real Stylelint rules.
- The dependency audit shows the listed duplicate/legacy packages are already absent from `package.json`; Capacitor CLI is already treated as development tooling.
- The root legacy utilities/services named in the Phase 1 prompt (`generate-qr.js`, `deploy-push-notifications.sh`, `dev-server.js`, `src/services/daily/`, legacy signaling wrappers, and `workingAreaRoutes.ts`) were already absent from the current tree.
- `.env.example` was updated to include `VITE_API_URL`, matching `src/config/env.ts`.

## Migration reconciliation — NOT YET COMPLETE

Remote Supabase migration history was inspected directly. The live project has **77 migration versions**, beginning at `20260903231856` and ending at `20260905125424`.

The Git repository does not yet contain an exact one-to-one representation of that history. The repository still contains the older `0001`–`0016` naming scheme and is missing a number of live migrations from the `20260903...` and `20260904...` periods, plus several later timestamp/name variants.

The live history includes, among others:
- `rls_helpers`
- `rls_company_array`
- `index_hardening`
- `fix_company_analytics_jsonb`
- `add_attendance_date_compatibility_column`
- `generate_ticket_numbers_per_company`
- `create_ticket_attachments_bucket`
- `communications_team_metadata`
- `communications_team_call_membership_sync`
- `communications_context_integrity`
- `communications_notification_triggers`
- `communications_call_notification_order`

These must be recovered with their actual SQL before the migration directory is declared canonical. No migration history was fabricated, renamed destructively, or marked repaired during this pass.

## Generated database types — NOT YET COMPLETE

The live schema was introspected and TypeScript types were generated from Supabase for comparison. The current `src/types/database.ts` is still a compatibility-heavy hand-maintained contract and therefore must not yet be treated as the final generated file.

The next safe step is to write the exact generated output from the live schema into `src/types/database.ts`, then keep only thin domain aliases/transformations in `src/types/domain.ts`.

## Pending confirmation before final Phase 1 sign-off

1. Recover the exact SQL for every live migration missing from Git.
2. Reconcile/rename the legacy `0001`–`0016` files to their real applied timestamps without changing their SQL.
3. Add the missing applied migrations in exact timestamp order.
4. Generate and commit the exact live Supabase TypeScript contract.
5. Run the repository's typecheck/build/lint commands locally after the structural deletions.
6. Confirm the legacy tables (`team_messages`, `message_reads`, `message_reactions`, `video_calls`, `call_participants`, `call_recordings`) have zero dependent rows before any table-drop migration is considered.

No legacy table has been dropped in Phase 1.
