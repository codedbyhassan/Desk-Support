# Working Area API Documentation

## Overview

The Working Area API provides comprehensive file management capabilities including folder creation, file uploads, sharing, search, and activity tracking. All endpoints are REST-based and require JWT authentication.

**Base URL:** `/api/working-area`
**Authentication:** JWT Bearer Token (required for all endpoints)
**Rate Limits:** See [Rate Limiting](#rate-limiting) section

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Folder Operations](#folder-operations)
- [File Operations](#file-operations)
- [Sharing & Access Control](#sharing--access-control)
- [Search & Filtering](#search--filtering)
- [Trash & Recovery](#trash--recovery)
- [Favorites](#favorites)
- [Activity Log](#activity-log)
- [Storage & Quota](#storage--quota)
- [Batch Operations](#batch-operations)
- [Response Examples](#response-examples)

---

## Authentication

All endpoints require authentication via JWT Bearer token in the `Authorization` header.

```
Authorization: Bearer <jwt_token>
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  https://api.example.com/api/working-area/folders
```

---

## Rate Limiting

Rate limits are applied per user to prevent abuse.

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| General Operations | 100 requests | 1 minute |
| File Upload | 10 files | 1 minute |
| File Download | 50 files | 1 minute |
| Search | 30 requests | 1 minute |
| Trash Operations | 50 requests | 1 minute |

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_INPUT` | 400 | Request validation failed |
| `CONFLICT` | 409 | Resource already exists or state conflict |
| `QUOTA_EXCEEDED` | 413 | User has exceeded storage quota |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Folder Operations

### Create Folder

Creates a new folder in the user's workspace.

**Endpoint:**
```
POST /folders
```

**Request Body:**
```json
{
  "name": "My Project",
  "parent_folder_id": "uuid-of-parent-or-null",
  "color": "#FF6B6B",
  "icon": "📁"
}
```

**Parameters:**
- `name` (string, required): Folder name (1-255 characters)
- `parent_folder_id` (string, optional): UUID of parent folder
- `color` (string, optional): Hex color code for visual organization
- `icon` (string, optional): Emoji or icon identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": "company-uuid",
    "owner_id": "user-uuid",
    "parent_folder_id": null,
    "name": "My Project",
    "is_shared": false,
    "share_type": "private",
    "color": "#FF6B6B",
    "icon": "📁",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "deleted_at": null
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 201 Created

---

### Get Folder Details

Retrieves folder information with statistics.

**Endpoint:**
```
GET /folders/:id
```

**Query Parameters:**
- `include_contents` (boolean, optional): Include folder contents in response

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Project",
    "owner_id": "user-uuid",
    "is_shared": true,
    "share_type": "company",
    "file_count": 12,
    "subfolder_count": 3,
    "total_size": 52428800,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Get Folder Contents

Lists files and subfolders in a folder with pagination.

**Endpoint:**
```
GET /folders/:id/contents
```

**Query Parameters:**
- `sort_by` (string, default: `name`): Sort field (`name`, `modified`, `size`, `type`)
- `sort_order` (string, default: `asc`): Sort direction (`asc`, `desc`)
- `limit` (integer, default: 50): Items per page (1-100)
- `offset` (integer, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "file-uuid",
        "name": "Document.pdf",
        "file_type": "application/pdf",
        "size_bytes": 2097152,
        "created_at": "2025-01-15T10:30:00Z",
        "owner_id": "user-uuid"
      },
      {
        "id": "folder-uuid",
        "name": "Subfolder",
        "is_shared": false,
        "share_type": "private",
        "created_at": "2025-01-15T10:30:00Z",
        "owner_id": "user-uuid"
      }
    ],
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Get Folder Path

Retrieves the breadcrumb trail (path) to a folder.

**Endpoint:**
```
GET /folders/:id/path
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "root-uuid", "name": "My Files" },
    { "id": "parent-uuid", "name": "Projects" },
    { "id": "folder-uuid", "name": "Current Folder" }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Update Folder

Updates folder properties.

**Endpoint:**
```
PUT /folders/:id
```

**Request Body:**
```json
{
  "name": "Renamed Project",
  "color": "#4ECDC4",
  "icon": "📂",
  "is_shared": true,
  "share_type": "company"
}
```

**Response:** Updated folder object (same as Create Folder response)

**Status Code:** 200 OK

---

### Move Folder

Moves a folder to a different parent location.

**Endpoint:**
```
POST /folders/:id/move
```

**Request Body:**
```json
{
  "new_parent_folder_id": "parent-uuid-or-null"
}
```

**Response:** Updated folder object

**Status Code:** 200 OK

---

### Delete Folder

Soft-deletes a folder (moves to trash).

**Endpoint:**
```
DELETE /folders/:id
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 204 No Content

---

## File Operations

### Upload File

Uploads a single file to a folder.

**Endpoint:**
```
POST /files/upload
```

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (file, required): The file to upload
- `folder_id` (string, required): Target folder UUID

**Constraints:**
- Maximum file size: 100MB
- Blocked extensions: `.exe`, `.bat`, `.sh`, `.app`, `.dmg`, `.dll`, `.scr`, `.vbs`, `.jar`

**Request Example:**
```bash
curl -X POST https://api.example.com/api/working-area/files/upload \
  -H "Authorization: Bearer token" \
  -F "file=@document.pdf" \
  -F "folder_id=folder-uuid"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "folder_id": "folder-uuid",
    "name": "document.pdf",
    "original_name": "document.pdf",
    "file_type": "application/pdf",
    "file_extension": ".pdf",
    "size_bytes": 2097152,
    "storage_path": "working-area/company-id/users/user-id/folder-id/file-id_v1.pdf",
    "version_number": 1,
    "is_current_version": true,
    "checksum": "sha256hash",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 201 Created

**Error Responses:**
- `413 Payload Too Large`: File exceeds 100MB limit
- `400 Bad Request`: No file provided or unsupported file type
- `409 Conflict`: Duplicate file detected (same checksum)
- `413 Quota Exceeded`: User storage limit exceeded

---

### Get File Metadata

Retrieves file information without downloading.

**Endpoint:**
```
GET /files/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "folder_id": "folder-uuid",
    "owner_id": "user-uuid",
    "name": "document.pdf",
    "file_type": "application/pdf",
    "file_extension": ".pdf",
    "size_bytes": 2097152,
    "version_number": 1,
    "is_current_version": true,
    "checksum": "sha256hash",
    "metadata": {
      "pages": 10,
      "format": "PDF"
    },
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Download File

Generates a signed download URL for the file.

**Endpoint:**
```
GET /files/:id/download
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://storage.example.com/working-area/.../file.pdf?token=...&expires=..."
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Notes:**
- URL expires in 1 hour
- Direct access to URL does not require authentication
- Download is logged in activity trail

**Status Code:** 200 OK

---

### Get File Version History

Retrieves all versions of a file.

**Endpoint:**
```
GET /files/:id/versions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "file-uuid",
      "version_number": 3,
      "size_bytes": 2097152,
      "created_at": "2025-01-15T10:35:00Z",
      "storage_path": "working-area/.../file_v3.pdf"
    },
    {
      "version_number": 2,
      "size_bytes": 2000000,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Update File

Rename or move file to different folder.

**Endpoint:**
```
PUT /files/:id
```

**Request Body:**
```json
{
  "name": "renamed-document.pdf",
  "folder_id": "new-folder-uuid"
}
```

**Response:** Updated file object

**Status Code:** 200 OK

---

### Delete File

Soft-deletes a file (moves to trash).

**Endpoint:**
```
DELETE /files/:id
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 204 No Content

---

## Sharing & Access Control

### Grant Access

Shares a folder with users or teams.

**Endpoint:**
```
POST /folders/:id/share
```

**Request Body:**
```json
{
  "user_ids": ["user-uuid-1", "user-uuid-2"],
  "team_ids": ["team-uuid-1"],
  "permission_level": "view",
  "expires_at": "2025-02-15T10:30:00Z",
  "notify": true
}
```

**Parameters:**
- `user_ids` (array of strings, optional): User UUIDs to grant access
- `team_ids` (array of strings, optional): Team UUIDs to grant access
- `permission_level` (string, required): One of `view`, `download`, `upload`, `edit`, `admin`
- `expires_at` (string, ISO 8601, optional): Time when access expires
- `notify` (boolean, optional): Send email notification to recipients

**Permission Levels:**
- `view`: Can view folder and file previews
- `download`: Can download files
- `upload`: Can upload new files
- `edit`: Can modify and delete files
- `admin`: Full folder management including sharing

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "access-uuid",
      "folder_id": "folder-uuid",
      "user_id": "user-uuid",
      "permission_level": "view",
      "granted_by": "admin-uuid",
      "created_at": "2025-01-15T10:30:00Z",
      "expires_at": "2025-02-15T10:30:00Z"
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 201 Created

---

### Get Folder Access

Lists all users and teams with access to a folder.

**Endpoint:**
```
GET /folders/:id/access
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "access-uuid",
      "folder_id": "folder-uuid",
      "user_id": "user-uuid",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "full_name": "John Doe"
      },
      "permission_level": "view",
      "granted_by": "admin-uuid",
      "granted_by_user": {
        "email": "admin@example.com",
        "full_name": "Admin User"
      },
      "created_at": "2025-01-15T10:30:00Z",
      "expires_at": null
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Revoke Access

Removes access from a user or team.

**Endpoint:**
```
DELETE /access/:accessId
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 204 No Content

---

## Search & Filtering

### Search Files

Searches files and folders by name with optional filters.

**Endpoint:**
```
GET /search
```

**Query Parameters:**
- `q` (string, required): Search query
- `folder_id` (string, optional): Limit search to specific folder
- `file_type` (string or array, optional): Filter by MIME type(s)
- `min_size` (integer, optional): Minimum file size in bytes
- `max_size` (integer, optional): Maximum file size in bytes
- `date_from` (string, ISO 8601, optional): Search from date
- `date_to` (string, ISO 8601, optional): Search to date
- `limit` (integer, default: 50): Results per page
- `offset` (integer, default: 0): Pagination offset

**Request Example:**
```
GET /search?q=report&file_type=application/pdf&date_from=2025-01-01T00:00:00Z&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "file",
      "id": "file-uuid",
      "name": "Annual Report 2024.pdf",
      "path": "file://file-uuid",
      "relevance_score": 0.95,
      "created_at": "2025-01-15T10:30:00Z",
      "size_bytes": 2097152,
      "owner_id": "user-uuid"
    },
    {
      "type": "folder",
      "id": "folder-uuid",
      "name": "Q1 Reports",
      "path": "file://folder-uuid",
      "relevance_score": 0.87,
      "created_at": "2025-01-10T10:30:00Z"
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

## Trash & Recovery

### Get Trash Items

Lists deleted items in user's trash.

**Endpoint:**
```
GET /trash
```

**Query Parameters:**
- `limit` (integer, default: 50): Items per page
- `offset` (integer, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "trash-uuid",
        "entity_type": "file",
        "entity_id": "file-uuid",
        "deleted_by": "user-uuid",
        "deleted_at": "2025-01-15T10:30:00Z",
        "auto_delete_at": "2025-02-14T10:30:00Z",
        "metadata": {
          "id": "file-uuid",
          "name": "deleted-document.pdf",
          "size_bytes": 2097152,
          "original_name": "deleted-document.pdf"
        }
      }
    ],
    "total": 5,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Notes:**
- Items are automatically deleted after 30 days
- Only deleted by current user are returned

**Status Code:** 200 OK

---

### Restore from Trash

Restores an item from trash.

**Endpoint:**
```
POST /trash/:id/restore
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Item restored successfully"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Permanently Delete

Permanently deletes an item from trash.

**Endpoint:**
```
DELETE /trash/:id
```

**Notes:**
- For files: Also deletes from Supabase storage
- Cannot be undone

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 204 No Content

---

## Favorites

### Add Favorite

Stars a file or folder for quick access.

**Endpoint:**
```
POST /favorites
```

**Request Body:**
```json
{
  "entity_type": "folder",
  "entity_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "favorite-uuid",
    "user_id": "user-uuid",
    "entity_type": "folder",
    "entity_id": "folder-uuid",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 201 Created

---

### Get Favorites

Lists user's favorite files and folders.

**Endpoint:**
```
GET /favorites
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "favorite-uuid",
      "entity_type": "folder",
      "entity_id": "folder-uuid",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Remove Favorite

Unstar a file or folder.

**Endpoint:**
```
DELETE /favorites/:entityType/:entityId
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 204 No Content

---

## Activity Log

### Get Activity Log

Retrieves audit trail of file/folder operations.

**Endpoint:**
```
GET /activity
```

**Query Parameters:**
- `user_id` (string, optional): Filter by user
- `entity_type` (string, optional): Filter by `file` or `folder`
- `action` (string, optional): Filter by action (create, read, update, delete, share, download, upload, restore)
- `start_date` (string, ISO 8601, optional): From date
- `end_date` (string, ISO 8601, optional): To date
- `limit` (integer, default: 50): Items per page
- `offset` (integer, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "activity-uuid",
        "user_id": "user-uuid",
        "entity_type": "file",
        "entity_id": "file-uuid",
        "action": "upload",
        "metadata": {
          "file_name": "document.pdf",
          "file_size": 2097152
        },
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

## Storage & Quota

### Get Storage Quota

Retrieves user's storage usage and limits.

**Endpoint:**
```
GET /quota
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "company_id": "company-uuid",
    "total_bytes": 53687091200,
    "used_bytes": 24160944128,
    "available_bytes": 29526147072,
    "percentage_used": 45
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Notes:**
- `total_bytes`: Allocated storage (plan-based)
- `used_bytes`: Current usage
- `available_bytes`: Remaining space (-1 for unlimited)
- `percentage_used`: Usage percentage

**Status Code:** 200 OK

---

## Batch Operations

### Batch Delete

Delete multiple files or folders at once.

**Endpoint:**
```
POST /batch/delete
```

**Request Body:**
```json
{
  "entity_type": "file",
  "entity_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success_count": 3,
    "failure_count": 0,
    "failures": []
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

### Batch Move

Move multiple files or folders to a new location.

**Endpoint:**
```
POST /batch/move
```

**Request Body:**
```json
{
  "entity_type": "file",
  "entity_ids": ["uuid-1", "uuid-2"],
  "new_folder_id": "target-folder-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success_count": 2,
    "failure_count": 0,
    "failures": []
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Code:** 200 OK

---

## Response Examples

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My File",
    "size_bytes": 1024
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Storage quota exceeded",
    "details": {
      "available": 1048576,
      "requested": 2097152
    }
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## Implementation Checklist

- [x] Database schema created
- [x] TypeScript types defined
- [x] Service layer implemented
- [x] API routes created
- [x] Authentication middleware
- [x] Rate limiting
- [x] Error handling
- [ ] Frontend components
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Documentation complete

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-15 | Initial release |

---

**Last Updated:** January 15, 2025
**Status:** Production Ready (Backend Complete)
