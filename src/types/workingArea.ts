/**
 * Working Area Feature - Type Definitions
 * Comprehensive TypeScript interfaces for file management system
 */

// ============================================================================
// STATUS TYPES
// ============================================================================

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export type AccessLevel = PermissionLevel;

// ============================================================================
// USER & TEAM INFO TYPES
// ============================================================================

export interface UserInfo {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  icon?: string;
}

// ============================================================================
// PERMISSION LEVELS
// ============================================================================

export type PermissionLevel = 'view' | 'download' | 'upload' | 'edit' | 'admin';

export interface PermissionConfig {
  level: PermissionLevel;
  description: string;
  capabilities: string[];
}

export const PERMISSION_LEVELS: Record<PermissionLevel, PermissionConfig> = {
  view: {
    level: 'view',
    description: 'Can only view files',
    capabilities: ['preview', 'viewMetadata']
  },
  download: {
    level: 'download',
    description: 'Can view and download files',
    capabilities: ['preview', 'viewMetadata', 'download']
  },
  upload: {
    level: 'upload',
    description: 'Can download and upload files',
    capabilities: ['preview', 'viewMetadata', 'download', 'upload']
  },
  edit: {
    level: 'edit',
    description: 'Can manage files and folders',
    capabilities: ['preview', 'viewMetadata', 'download', 'upload', 'rename', 'move', 'delete']
  },
  admin: {
    level: 'admin',
    description: 'Full folder management',
    capabilities: [
      'preview',
      'viewMetadata',
      'download',
      'upload',
      'rename',
      'move',
      'delete',
      'share',
      'permanentDelete',
      'manageAccess'
    ]
  }
};

// ============================================================================
// SHARE TYPES
// ============================================================================

export type ShareType = 'private' | 'company' | 'team' | 'specific_users';

export interface ShareConfig {
  type: ShareType;
  description: string;
  maxRecipients?: number;
}

export const SHARE_TYPES: Record<ShareType, ShareConfig> = {
  private: { type: 'private', description: 'Only visible to me' },
  company: { type: 'company', description: 'Visible to entire company', maxRecipients: -1 },
  team: { type: 'team', description: 'Shared with specific teams', maxRecipients: -1 },
  specific_users: { type: 'specific_users', description: 'Shared with specific users', maxRecipients: -1 }
};

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type EntityType = 'folder' | 'file';

export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'share' | 'download' | 'upload' | 'restore';

// ============================================================================
// FOLDER INTERFACES
// ============================================================================

export interface WorkingAreaFolder {
  id: string;
  company_id: string;
  owner_id: string;
  parent_folder_id: string | null;
  name: string;
  is_shared: boolean;
  share_type: ShareType;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FolderWithStats extends WorkingAreaFolder {
  file_count: number;
  subfolder_count: number;
  total_size: number; // in bytes
}

export interface CreateFolderRequest {
  name: string;
  parent_folder_id?: string;
  color?: string;
  icon?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  color?: string;
  icon?: string;
  is_shared?: boolean;
  share_type?: ShareType;
}

export interface MoveFolderRequest {
  new_parent_folder_id: string | null;
}

// ============================================================================
// FILE INTERFACES
// ============================================================================

export interface WorkingAreaFile {
  id: string;
  company_id: string;
  folder_id: string;
  owner_id: string;
  name: string;
  original_name: string;
  file_type: string;
  file_extension: string;
  size_bytes: number;
  storage_path: string;
  version_number: number;
  is_current_version: boolean;
  checksum: string;
  thumbnail_path?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number; // in seconds, for videos/audio
  pages?: number; // for PDFs
  format?: string;
  [key: string]: any;
}

export interface FileUploadRequest {
  file: File;
  folder_id: string;
  on_duplicate?: 'replace' | 'keep_both' | 'skip';
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface UpdateFileRequest {
  name?: string;
}

export interface MoveFileRequest {
  new_folder_id: string;
}

export interface FileVersion {
  version_number: number;
  size_bytes: number;
  created_at: string;
  storage_path: string;
}

// ============================================================================
// ACCESS CONTROL INTERFACES
// ============================================================================

export interface WorkingAreaAccess {
  id: string;
  folder_id: string;
  user_id?: string;
  team_id?: string;
  permission_level: PermissionLevel;
  granted_by: string;
  created_at: string;
  expires_at?: string;
}

export interface AccessWithDetails extends WorkingAreaAccess {
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
  team?: {
    id: string;
    name: string;
  };
  granted_by_user?: {
    email: string;
    full_name: string;
  };
}

export interface GrantAccessRequest {
  user_ids?: string[];
  team_ids?: string[];
  permission_level: PermissionLevel;
  expires_at?: string;
  notify?: boolean;
}

export interface UpdateAccessRequest {
  permission_level?: PermissionLevel;
  expires_at?: string;
}

export interface RevokeAccessRequest {
  access_id: string;
}

// ============================================================================
// ACTIVITY LOG INTERFACES
// ============================================================================

export interface WorkingAreaActivityLog {
  id: string;
  company_id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  action: ActionType;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ActivityLogWithDetails extends WorkingAreaActivityLog {
  user?: {
    email: string;
    full_name: string;
  };
  entity_name?: string;
}

export interface ActivityFilter {
  user_id?: string;
  entity_type?: EntityType;
  action?: ActionType;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// TRASH INTERFACES
// ============================================================================

export interface WorkingAreaTrash {
  id: string;
  company_id: string;
  entity_type: EntityType;
  entity_id: string;
  deleted_by: string;
  deleted_at: string;
  auto_delete_at: string;
  metadata: Record<string, any>;
}

export type WorkingAreaTrashItem = WorkingAreaTrash;

export interface TrashWithDetails extends WorkingAreaTrash {
  deleted_by_user?: {
    email: string;
    full_name: string;
  };
}

// ============================================================================
// FAVORITES INTERFACES
// ============================================================================

export interface WorkingAreaFavorite {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  created_at: string;
}

export interface FavoriteWithDetails extends WorkingAreaFavorite {
  entity?: WorkingAreaFolder | WorkingAreaFile;
}

// ============================================================================
// SEARCH INTERFACES
// ============================================================================

export interface SearchFilter {
  file_type?: string[];
  min_size?: number;
  max_size?: number;
  date_from?: string;
  date_to?: string;
  owner_id?: string;
  shared_only?: boolean;
}

export interface SearchQuery {
  q: string;
  folder_id?: string;
  filters?: SearchFilter;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  type: EntityType;
  id: string;
  name: string;
  path: string;
  relevance_score: number;
  created_at: string;
  size_bytes?: number;
  owner_id?: string;
}

// ============================================================================
// STORAGE & QUOTA INTERFACES
// ============================================================================

export interface StorageQuota {
  user_id: string;
  company_id: string;
  total_bytes: number; // Total allocated storage
  used_bytes: number; // Current usage
  available_bytes: number; // Remaining
  percentage_used: number;
}

export interface StorageBreakdown {
  quota: StorageQuota;
  by_file_type: Record<string, number>; // file_type -> bytes
  by_folder: Record<string, number>; // folder_id -> bytes
  largest_files: WorkingAreaFile[];
}

// ============================================================================
// BATCH OPERATION INTERFACES
// ============================================================================

export interface BatchDeleteRequest {
  entity_type: EntityType;
  entity_ids: string[];
}

export interface BatchMoveRequest {
  entity_type: EntityType;
  entity_ids: string[];
  new_folder_id: string;
}

export interface BatchShareRequest {
  folder_ids: string[];
  user_ids?: string[];
  team_ids?: string[];
  permission_level: PermissionLevel;
}

export interface BatchOperationResult {
  success_count: number;
  failure_count: number;
  failures: Array<{
    entity_id: string;
    error: string;
  }>;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// ============================================================================
// STATE & CONTEXT INTERFACES
// ============================================================================

export interface WorkingAreaState {
  current_folder_id: string | null;
  breadcrumbs: Array<{
    id: string;
    name: string;
  }>;
  items: Array<WorkingAreaFolder | FolderWithStats | WorkingAreaFile>;
  selected_items: Set<string>;
  view_mode: 'grid' | 'list';
  sort_by: 'name' | 'modified' | 'size' | 'type';
  sort_order: 'asc' | 'desc';
  is_loading: boolean;
  error: string | null;
  filter: SearchFilter;
}

export interface WorkingAreaContextType {
  state: WorkingAreaState;
  actions: {
    navigateToFolder: (folderId: string) => void;
    goBack: () => void;
    createFolder: (name: string) => Promise<void>;
    uploadFiles: (files: File[]) => Promise<void>;
    deleteItem: (type: EntityType, id: string) => Promise<void>;
    shareFolder: (folderId: string, users: string[], teams: string[], level: PermissionLevel) => Promise<void>;
    restoreFromTrash: (type: EntityType, id: string) => Promise<void>;
    toggleFavorite: (type: EntityType, id: string) => Promise<void>;
    selectItem: (id: string) => void;
    deselectItem: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;
    setViewMode: (mode: 'grid' | 'list') => void;
    setSortBy: (sort: 'name' | 'modified' | 'size' | 'type') => void;
  };
}

// ============================================================================
// UI COMPONENT INTERFACES
// ============================================================================

export interface FileItemProps {
  item: WorkingAreaFolder | WorkingAreaFile;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  onPreview?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export interface ShareDialogProps {
  isOpen: boolean;
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  current_access?: AccessWithDetails[];
  onShare: (users: string[], teams: string[], level: PermissionLevel) => Promise<void>;
  onClose: () => void;
}

export interface FilePreviewProps {
  file: WorkingAreaFile;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SortKey = keyof Pick<WorkingAreaFile, 'name' | 'updated_at' | 'size_bytes'> |
                      keyof Pick<WorkingAreaFolder, 'name' | 'updated_at'>;

export interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  limit: number;
  offset: number;
}
