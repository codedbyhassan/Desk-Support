# Phase 1 — Canonical Architecture Change Log

Date: 2026-09-05
Repository: `codedbyhassan/Desk-Support`
Branch: `main`

## Scope

This phase establishes one canonical frontend/backend architecture. Security, domain correctness, UX redesign, accessibility, billing, attendance/QR redesign, and broader production hardening remain outside this phase.

## Completed

### Legacy files removed

- `src/services/daily/daily.ts` — removed unused Daily calling service.
- `src/services/video/signaling.ts` — removed legacy WebSocket signaling service.
- `src/services/video/supabase-signaling.ts` — removed duplicate legacy signaling service.
- `src/services/supabase/supabase.ts` — removed redundant Supabase client re-export.
- `src/lib/api/workingAreaRoutes.ts` — removed unused Express placeholder.
- `generate-qr.js` — removed root QR terminal utility; QR generation remains an Edge Function.
- `deploy-push-notifications.sh` — removed obsolete deployment helper referencing old infrastructure.
- `dev-server.js` — removed custom Express/WebSocket server; Vite is the canonical development server and Supabase Realtime is the canonical signaling transport.
- `src/hooks/useTeamCall.ts` — removed unused legacy team-call state machine.
- `src/components/ToastNotification.tsx` — removed duplicate custom toast renderer.
- `src/components/ui/sonner.tsx` — removed unused Sonner/next-themes adapter.
- `src/context/ColorSchemeContext.tsx` — removed redundant color-scheme context.
- `src/components/ColorSchemeSelector.tsx` — removed obsolete selector.
- `src/lib/colorSchemes.ts` — removed obsolete color-scheme implementation.
- Legacy Daily Edge Function source files in Git: `supabase/functions/create-call/index.ts`, `call-token/index.ts`, and `end-call/index.ts` removed after confirming they target `video_calls`/Daily rather than the canonical `calls` model.

### Canonical communications

- Added live migration `20260905125424_team_conversation_canonicalization.sql`.
- Added `get_or_create_team_conversation(uuid)` RPC.
- Team conversations are now represented as `conversations.kind = 'team'` with `metadata.team_id`.
- Team membership is synchronized into `conversation_members` by the RPC.
- `TeamChatView` now uses the canonical `conversations`/`messages` stack and `useCommunications`.
- Team video calls are started through the canonical call flow and route to `/app/calls/:callId`.
- Legacy frontend references to `team_messages`, `message_reads`, and `message_reactions` were checked and the old TeamChatView path was removed.

### Canonical calling

- Frontend calling remains on `calls` + `call_participants_v2` + Supabase Realtime + WebRTC.
- `CallPage` now starts legacy `/app/teams/call/:roomId` links through `start_team_call` and immediately resolves them to canonical `/app/calls/:callId`.
- The repository no longer contains the old Daily/WebSocket calling implementation.

### Theme and toast

- `ThemeProvider` is the sole theme provider.
- It supports `light`, `dark`, and `system` and reads `company_settings.default_theme` when no local override exists.
- The application now renders the shadcn/Radix toast system through `components/ui/toaster`.
- Notification popups were moved onto the same toast primitive instead of maintaining a second custom toast queue.
- `react-hot-toast`, `sonner`, and `next-themes` were removed from `package.json`.

### Dependencies/configuration

- Removed legacy runtime dependencies: Daily-era/Express/WebSocket/terminal-QR packages and unused UI candidates identified during the Phase 1 import audit.
- Moved `@capacitor/cli` to `devDependencies`.
- Removed the obsolete `dev:unified` script.
- Added `.stylelintrc.json` extending `stylelint-config-standard` with Tailwind-compatible at-rule handling and real validation rules.
- Removed the deleted toast package from Vite `optimizeDeps`.
- `.env.example` now documents `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`, and `VITE_VAPID_PUBLIC_KEY`, and no longer documents the removed WebSocket signaling URL.
- Local Supabase Auth redirect configuration was aligned with the canonical Vite port `4000`.

### Types

- Live Supabase TypeScript generation was run against project `clvximrurzyfsgctdlvb` and used to reconcile the database contract.
- Raw database typing is now separated from application/domain models.
- `src/types/domain.ts` contains frontend view/domain shapes and transformation helpers.
- `src/types/database.ts` is reserved for the Supabase schema contract and no longer uses `Database = any`.

## Live database checks

The live database currently reports zero rows in all six explicitly retired legacy communication/calling tables checked during this phase:

- `team_messages`: 0
- `message_reads`: 0
- `message_reactions`: 0
- `video_calls`: 0
- `call_participants`: 0
- `call_recordings`: 0

All public tables inspected in the live schema currently have RLS enabled.

## Pending confirmation before destructive DB cleanup

The legacy tables have **not** been dropped in this phase. Their foreign-key relationships were inspected and they form a legacy dependency chain (`message_reads`/`message_reactions` -> `team_messages`, and `call_participants`/`call_recordings` -> `video_calls`). A future append-only migration can drop them only after the full repository and live Edge Function inventory is confirmed clean.

The live project still has three deployed legacy Edge Functions — `create-call`, `call-token`, and `end-call` — that read/write `video_calls`. The repository source for those functions has been removed, but the available Supabase management tool does not expose an Edge Function deletion operation. They therefore remain a manual dashboard cleanup item rather than being falsely claimed as deleted.

## Migration-history reconciliation status

The live Supabase migration ledger contains 72 applied migrations, including the historical `20260905112659 add_usernames_v2` migration and the newly applied `20260905125424 team_conversation_canonicalization` migration.

The repository contains a legacy numbered migration series (`0001_...`, `0002_...`, etc.) while the live ledger uses timestamp versions. The username discrepancy was reconciled by replacing the unapplied `20260905113000_add_usernames.sql` repository file with the live-applied `20260905112659_add_usernames_v2.sql` file. The full historical timestamp-to-numbered migration mapping still requires a controlled repository migration-file rename/reconciliation pass; this must not be approximated by editing applied SQL.

## Dependency lockfile note

`package-lock.json` was intentionally not hand-edited. `package.json` was cleaned as requested, but the lockfile still reflects the pre-cleanup root dependency set until a normal `npm install`/lockfile regeneration is run in a working checkout. This is intentionally recorded rather than fabricating a lockfile.

## Verification policy

CI/deploy status is not used as a gate for this phase. Structural verification was performed by re-fetching changed files, checking known consumers before removal, inspecting live Supabase migration metadata, inspecting live legacy row counts, and inspecting the deployed legacy calling functions.
