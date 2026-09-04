# Desk-Support database migrations

The database is reconstructed from the legacy `schema.md` into ordered PostgreSQL migrations. The live Supabase project is the runtime source of truth.

## Rules

1. `auth.users` is the authentication source of truth.
2. `public.profiles` contains application profile data only.
3. `public.company_memberships` is the source of truth for company membership and company-scoped roles.
4. Child records reference their owning aggregate directly; do not duplicate `company_id` without a proven query/security need.
5. Every relationship that can be represented with a foreign key uses one.
6. Do not use polymorphic references where referential integrity matters.
7. Store each fact once. Derive status, counts, and context from canonical records.
8. Prefer `timestamptz`, UUIDs, `NOT NULL`, `CHECK`, `UNIQUE`, and explicit foreign-key behaviour.
9. RLS expresses tenant membership and least privilege; client-supplied tenant IDs are never trusted for authorization.
10. Functions/triggers exist only for database-owned invariants or privileged workflows.
11. Applied migrations are immutable. Corrections are new migrations.
12. `schema.md` is legacy documentation, not executable migration SQL.

## Migration order

- `0001_foundation.sql` — tenancy, identity, organisation, memberships, and baseline RLS.
- `0002_support.sql` — tickets and normalized support children.
- `0003_assets.sql` — assets, assignments, history, and asset/ticket relationships.
- `0004_communications.sql` — teams, messages, reactions, reads, and calls.
- `0005_workspace.sql` — folders, files, versions, shares, and favorites.
- `0006_notifications.sql` — notifications, preferences, devices, and deliveries.
- `0007_attendance_qr.sql` — attendance, QR definitions, restrictions, and scans.
- `0008_billing.sql` — subscriptions, events, and payments.
- `0009_audit.sql` — append-oriented audit records.
- `0010_security_hardening.sql` — final least-privilege RLS/grants/security corrections.
- `0011_cache.sql` — application/server-state caching infrastructure only.
- `0012_exact_counts_and_large_dataset_access.sql` — exact company counts and high-volume access support.
- `0013_team_creator_membership.sql` — secure creator self-membership for newly created teams.
- `0014_company_analytics.sql` — exact server-side analytics aggregates.
- `0015_fix_company_analytics_aggregation.sql` — optimized analytics aggregation without ticket/asset cross-products.

`0011` is intentionally reserved for cache work. Views are not part of the canonical schema unless a later migration proves they materially simplify a stable query.

## Data-access contract

Dashboard/stat cards use database-side exact counts rather than the number of rows currently rendered. Lists use explicit PostgREST ranges and a bounded render window. A screen must never assume the API's default response limit is the total dataset.

The frontend data-access layer uses a 1,000-row request page, controlled concurrency for explicit bulk reads, and a 500,000-row safety ceiling. Normal screens should render a much smaller window.

## Foundation decisions

- user email/password data is not duplicated into `public.users`;
- company roles live on memberships;
- subscriptions are not duplicated on companies;
- settings are one-to-one with companies;
- tenant context is derived from authenticated active memberships;
- timestamps use shared database triggers where appropriate;
- no trigger silently overwrites caller-supplied tenant ownership;
- child tables inherit tenant boundaries through their real parent relationships.

## Important

Do not edit an applied migration to repair application behaviour. Reconcile the application to the live canonical schema first; any database correction gets a new ordered migration and is verified against the live project before the client is changed to depend on it.
