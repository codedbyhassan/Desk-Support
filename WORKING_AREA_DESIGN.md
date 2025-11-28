# Working Area Feature - Design Iteration

## Overview
A collaborative file storage and management system accessible to all users, allowing creation of folders, file uploads, and shared access to working documents.

---

## 1. FEATURE COMPONENTS

### 1.1 Working Area Menu Item
- **Location**: Added to sidebar navigation between "Teams" and "Users"
- **Icon**: FolderOpen or LayoutGrid
- **Badge**: Optional count of recent/unread items
- **Access**: Available to all authenticated users

### 1.2 Main Working Area Page Structure
```
┌─────────────────────────────────────────┐
│  Working Area                    [+ New] │
├─────────────────────────────────────────┤
│ Breadcrumb: My Workspace / Folder Name  │
├─────────────────────────────────────────┤
│  [View Toggle]  [Search]  [Filter]      │
├─────────────────────────────────────────┤
│                                         │
│  Folders & Files Grid/List View         │
│  - Folders (create/rename/delete)       │
│  - Files (upload/download/delete)       │
│  - Last Modified, Size, Owner           │
│                                         │
└─────────────────────────────────────────┘
```

### 1.3 User Folder Structure
Each user has a personal workspace with two types of access:
- **Personal Folders**: Only owned by the user
- **Shared Folders**: Owned by user but accessible to all users (shared with everyone)
- **Collaborative Folders**: Can be accessed by teams

---

## 2. DATABASE SCHEMA (Supabase)

### 2.1 Tables Structure

#### `working_area_folders`
```sql
- id (uuid, PK)
- name (text) - folder name
- owner_id (uuid, FK users.id)
- parent_folder_id (uuid, FK working_area_folders.id) - null for root
- company_id (uuid, FK companies.id)
- is_shared (boolean) - if true, accessible to all users
- created_at (timestamp)
- updated_at (timestamp)
- description (text, nullable)
```

#### `working_area_files`
```sql
- id (uuid, PK)
- name (text) - file name with extension
- folder_id (uuid, FK working_area_folders.id)
- owner_id (uuid, FK users.id)
- file_path (text) - path in storage bucket
- file_size (integer) - in bytes
- mime_type (text)
- company_id (uuid, FK companies.id)
- created_at (timestamp)
- updated_at (timestamp)
- description (text, nullable)
```

#### `working_area_access` (For future collaboration features)
```sql
- id (uuid, PK)
- resource_id (uuid) - folder_id or file_id
- resource_type (enum: 'folder', 'file')
- granted_to_user_id (uuid, FK users.id)
- granted_by_user_id (uuid, FK users.id)
- permission_type (enum: 'view', 'edit', 'delete')
- created_at (timestamp)
```

#### Storage Bucket
- **Name**: `working-area-files`
- **Path Pattern**: `{company_id}/{user_id}/{folder_path}/{file_name}`

---

## 3. FEATURES BREAKDOWN

### Phase 1: MVP (This Iteration)
- [x] Display user's root workspace
- [x] Create folders
- [x] Upload files to folders
- [x] View files and folders in grid/list
- [x] Delete folders (if empty)
- [x] Delete files
- [x] Download files
- [x] Mark folders as "shared with all users"
- [x] View shared folders from all users
- [ ] Basic search functionality

### Phase 2: Enhancement
- [ ] Folder renaming
- [ ] File versioning
- [ ] Drag-and-drop reordering
- [ ] Advanced permission system (per-user access)
- [ ] File preview for common formats (PDF, images, documents)
- [ ] Bulk operations (multi-select, batch delete)

### Phase 3: Collaboration
- [ ] Team-based folders
- [ ] Real-time collaboration with WebRTC
- [ ] Comment/annotation system
- [ ] Activity log/audit trail

---

## 4. UI/UX LAYOUT

### 4.1 Sidebar Breadcrumb
```
My Workspace > [Folder1] > [Folder2]
[← Back] [Home] [+ New Folder]
```

### 4.2 Toolbar
```
[Grid View] [List View] | [Search...] | [Filter ▼] | [+ New]
```

### 4.3 Main Content Area
**Grid View (Default)**
- Folder cards with folder icon
- File cards with file type icon
- Hover shows: Name, Size, Date, Owner
- Right-click context menu: Download, Delete, Properties

**List View**
- Table format: Name, Type, Size, Modified, Owner, Actions

### 4.4 Context Menu (Right-click)
```
Folders:
- Rename
- Mark as Shared / Remove from Shared
- Delete (if empty)
- Properties
- Share Settings

Files:
- Download
- Rename
- Delete
- Properties
- Move to Folder (drag-drop)
```

---

## 5. INTERACTION FLOWS

### 5.1 Create New Folder
1. Click "+ New" button
2. Select "New Folder"
3. Modal opens with input field
4. Enter folder name
5. Folder created and displayed

### 5.2 Upload File
1. Click "+ New" button or drag-drop zone
2. Select "Upload File"
3. Choose file from system
4. File uploaded to current folder
5. File displayed in list

### 5.3 Share Folder with All Users
1. Right-click folder → "Share Settings"
2. Toggle "Share with all users" ON
3. Confirmation dialog
4. Folder now visible to all users (read-only unless admin)

### 5.4 View Shared Folders
1. In Working Area, create section "Shared with Me"
2. Display all folders where is_shared = true
3. Users can view/download but cannot modify

---

## 6. PERMISSIONS MODEL

| Action | Personal Folder | Shared Folder | Admin |
|--------|-----------------|---------------|-------|
| View | ✅ Owner only | ✅ All users | ✅ |
| Upload | ✅ Owner only | ❌ View only | ✅ |
| Delete File | ✅ Owner | ❌ No | ✅ |
| Delete Folder | ✅ Owner (if empty) | ❌ No | ✅ |
| Rename | ✅ Owner | ❌ No | ✅ |
| Share | ✅ Owner | ✅ Can unshare | ✅ |

---

## 7. QUESTIONS FOR ITERATION

1. **File Size Limits**
   - Should there be a per-file limit? (e.g., 100MB)
   - Should there be a per-user quota? (e.g., 1GB)

2. **Shared Folder Access**
   - Should all users be able to see shared folders by default?
   - Or should they need to "bookmark" or "favorite" them?

3. **File Organization**
   - Should users be able to move files between their own folders?
   - Should there be automatic categorization by file type?

4. **Notifications**
   - Should users be notified when files are shared with them?
   - Activity feed for workspace changes?

5. **Admin Controls**
   - Can admins access all user workspaces?
   - Should there be a compliance/audit log?

6. **Retention & Deletion**
   - Should deleted files go to trash first?
   - Auto-delete after X days?

---

## 8. IMPLEMENTATION ROADMAP

### Step 1: Database Setup
- [ ] Create Supabase tables
- [ ] Set up RLS policies
- [ ] Create storage bucket

### Step 2: Frontend Components
- [ ] Create `WorkingAreaPage.tsx`
- [ ] Create `FolderView.tsx` component
- [ ] Create `FileUpload.tsx` component
- [ ] Create `FolderContextMenu.tsx`

### Step 3: Hooks & Services
- [ ] Create `useWorkingArea.ts` hook
- [ ] Create `useFileUpload.ts` hook
- [ ] Create `workingArea.service.ts`

### Step 4: Integration
- [ ] Add "Working Area" to navigation
- [ ] Add route `/app/working-area`
- [ ] Add route `/app/working-area/:folderId`

### Step 5: Testing & Polish
- [ ] Test file upload/download
- [ ] Test folder creation/deletion
- [ ] Test sharing functionality
- [ ] Mobile responsiveness

---

## NEXT STEPS

Please review and confirm:
1. ✅ Overall feature scope
2. ✅ Database schema structure
3. ✅ UI/UX layout approach
4. ✅ Permission model
5. ✅ Answers to iteration questions

Once approved, I'll proceed with:
1. Creating Supabase tables & SQL
2. Building components
3. Setting up file storage
