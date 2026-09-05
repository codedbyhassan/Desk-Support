# Phase 4 — UX

Phase 4 brings the application UI back into alignment with the Phase 1–3 architecture and backend state.

## Completed

- Replaced the header's static search affordance with a real command search.
  - `⌘K` / `Ctrl+K` opens it.
  - Ticket search uses the server-side `search_tickets` RPC.
  - Assets are searched server-side within the active company.
  - Results are grouped and keyboard selectable.
- Removed obsolete header `primaryColor` props and hardcoded branding values.
- Applied company primary/secondary/accent colors to the semantic theme tokens when configured.
- Rebuilt mobile navigation to mirror the desktop sidebar hierarchy.
  - Removed the duplicate Dashboard identity block.
  - Removed the embedded user profile panel.
  - Removed the obsolete `lightenColor()` helper.
- Reorganized Settings into Account, Security, Workspace, Notifications, Appearance, Company and Billing sections.
  - Removed unnecessary company ID exposure.
  - Password UI now requires 8 characters.
  - Added a real Supabase Authenticator/TOTP MFA enrollment, verification and removal flow.
  - Removed local-only notification switches that did not map to persisted backend behavior.
  - Billing is read-only unless a provider-backed lifecycle is available; no fake checkout controls are shown.
- Reconciled browser push state against the canonical `notification_devices` table.
  - Enabling requires browser subscription plus successful server registration.
  - Disabling revokes the server device record and browser subscription.
  - Status is derived from the current browser subscription and server record, not local preference state.
- Standardized the shared Loader around skeleton UI and added page-level error boundaries with local recovery.
- Added empty/error/loading affordances and keyboard semantics to communications and retained the ticket list's semantic keyboard behavior.
- Added accessible labels to major icon-only controls and live announcements for call activity.
- Reworked landing-page CSS into readable sections using the application's semantic design tokens and responsive breakpoints.
- Removed hardcoded marketing colors that bypassed the theme tokens.

## Responsive pass

The layout rules were reviewed for the required widths: 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px. The highest-risk areas use explicit mobile/tablet/desktop transitions, flexible grids and overflow-safe controls.

A real browser/device visual pass still depends on running the production build in a browser; this repository session does not expose a browser automation surface, so no screenshot-based visual test result is claimed here.

## Intentionally deferred to Phase 5

- Observability and production telemetry.
- Infrastructure-level rate limiting and retry policy.
- Realtime recovery/backoff.
- WebRTC TURN/reconnection infrastructure.
- Backup/restore and storage lifecycle operations.
- Production release checklist and deployment hardening.
