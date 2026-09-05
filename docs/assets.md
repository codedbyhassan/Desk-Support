# Assets Module

The Assets module is the equipment and company-property registry for Desk Support. It is deliberately relational: the asset record stores the equipment identity and lifecycle data, while assignments, maintenance, images, history and ticket relationships live in their own tables.

## Data model

```text
assets
├── asset_assignments     current + historical ownership
├── asset_images          private Supabase Storage metadata
├── asset_maintenance     maintenance lifecycle and costs
├── asset_history         immutable lifecycle activity
└── asset_tickets         links assets to support tickets
```

### `assets` payload

The create form sends only columns belonging to `public.assets`:

- `company_id`
- `asset_tag`
- `name`
- `description`
- `category`
- `manufacturer`
- `model`
- `serial_number`
- `status`
- `condition`
- `purchase_date`
- `purchase_cost`
- `warranty_expires_at`
- `location`
- `notes`
- `created_by`
- `metadata`

`id`, timestamps and archive state are database-managed. Assignment is intentionally **not** embedded in this payload; it is recorded in `asset_assignments` so the application retains an audit trail.

## Images

Asset images do **not** use externally supplied URLs.

The application uses the private `asset-images` Supabase Storage bucket. Objects use this layout:

```text
{authenticated-user-id}/{asset-id}/{random-uuid}.{extension}
```

The database stores the storage path and image metadata in `asset_images`. The UI requests short-lived signed URLs only when it needs to render an image. Those signed URLs are presentation-time access tokens, not permanent image fields on an asset.

Allowed formats:

- JPEG
- PNG
- WebP

Maximum size: **10 MB per image**.

The primary image is enforced by the database and switched through `set_primary_asset_image`, so the UI does not have to manage two conflicting primary flags itself.

## Lifecycle

Supported asset statuses:

- `active` — available for use
- `assigned` — currently issued to a person
- `maintenance` — undergoing active maintenance
- `retired` — no longer operational
- `lost` — reported missing

The database prevents invalid combinations such as an `assigned` asset without an active assignment or an asset being returned to `active` while maintenance is still open.

Maintenance records follow:

```text
open → in_progress → completed
                  ↘ cancelled
```

Maintenance status changes automatically keep the parent asset lifecycle aligned.

## Authorization

All asset tables are company-scoped through RLS. Members can read assets belonging to their company. Administrative asset mutations are limited to `admin`, `hr` and `manager` roles by the existing asset policies.

Storage access follows the same company/role boundary and the asset ID encoded in the object path. The bucket is private.

## UI contract

The module has two primary surfaces:

### Inventory

`/app/assets`

- inventory statistics
- search and status filtering
- primary image preview
- asset identity and location
- warranty visibility
- archive action for authorized managers
- create-asset dialog

### Asset detail

`/app/assets/:id`

- image gallery
- primary-image management
- asset information
- assignment management
- related tickets
- maintenance records and lifecycle controls
- lifecycle history
- edit and archive actions

The `/app/assets/new` route opens the create dialog directly and returns to inventory after a successful creation.

## Failure handling

Image uploads are intentionally treated as a two-resource operation:

1. create the database asset
2. upload the private Storage object
3. create the `asset_images` metadata row
4. create the assignment, if requested
5. clean up uploaded Storage objects and the newly created asset if a later step fails

This prevents the common failure mode where a failed form submission leaves orphaned files behind.
