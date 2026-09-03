# Desk-Support database migrations

The database is being reconstructed from the legacy `schema.md` into real, ordered PostgreSQL migrations.

## Rules

1. `auth.users` is the authentication source of truth.
2. `public.profiles` contains application profile data only.
3. `public.company_memberships` is the source of truth for company membership and company-scoped roles.
4. Child records should reference their owning aggregate directly; do not copy `company_id` everywhere unless it is required for a proven query/security boundary.
5. Every relationship that can be represented with a foreign key must use one.
6. Do not use polymorphic `entity_type/entity_id` references where referential integrity matters.
7. Store one fact once. Derive status, counts, and context from canonical records where practical.
8. Prefer `timestamptz`, UUIDs, `NOT NULL`, `CHECK`, `UNIQUE`, and explicit foreign-key delete behavior.
9. RLS policies must express tenant membership and least privilege; application code must not be trusted to supply a correct tenant ID.
10. Functions and triggers are added only when the invariant genuinely belongs in the database.
11. Legacy schema objects are not silently dropped by the redesign. Migration/deprecation steps will be explicit.
12. `schema.md` is documentation of the legacy design and is not itself an executable migration.

## Migration order

- `0001_foundation.sql` — tenancy, identity, organisation foundation, membership roles, and baseline RLS.
- `0002_support.sql` — support tickets and their normalized child records.
- `0003_assets.sql` — assets, assignments, history, and asset/ticket relationships.
- `0004_communications.sql` — teams, messages, reactions, reads, and calls.
- `0005_workspace.sql` — folders, files, versions, shares, and favorites.
- `0006_notifications.sql` — notifications, preferences, devices, and delivery records.
- `0007_attendance_qr.sql` — attendance, QR definitions, restrictions, and scan records.
- `0008_billing.sql` — subscriptions, subscription events, and payments.
- `0009_audit.sql` — append-oriented audit records and retention indexes.
- `0010_rls.sql` — final least-privilege policies after all tables exist.
- `0011_views.sql` — only views that materially simplify stable application queries.

The later migration names are the target architecture and will be added incrementally after each domain is reconciled with the application code. No legacy table should be dropped until its consumers and data migration are verified.

## Foundation decisions

The first migration deliberately removes several legacy design problems:

- user email/password data is not duplicated into an application `users` table;
- a user can belong to more than one company without changing identity records;
- company role is a membership concern, not a global user attribute;
- subscription fields are not duplicated on `companies`;
- settings are one-to-one with a company;
- membership is represented by a real junction table;
- tenant discovery is centralized in `current_company_ids()`;
- timestamps use one shared database trigger;
- no trigger silently overwrites caller-supplied `company_id`;
- tenant context is derived from authenticated membership for RLS.

## Important

`0001_foundation.sql` is the beginning of the canonical schema, not a claim that the legacy database can be migrated by simply running every new file. The application must be moved domain-by-domain, followed by a controlled data migration and explicit removal of obsolete objects.
