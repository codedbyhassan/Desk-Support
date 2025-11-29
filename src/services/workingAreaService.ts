/**
 * Working Area Feature - Service Layer
 * Handles all interactions with Supabase for file management
 */

import { createClient } from '@supabase/supabase-js';
import type {
  WorkingAreaFolder,
  WorkingAreaFile,
  WorkingAreaAccess,
  WorkingAreaActivityLog,
  WorkingAreaTrash,
  WorkingAreaFavorite,
  CreateFolderRequest,
  UpdateFolderRequest,
  GrantAccessRequest,
  SearchQuery,
  SearchResult,
  StorageQuota,
  FolderWithStats,
  AccessWithDetails,
  ActivityFilter,
  EntityType,
  ActionType,
  PermissionLevel,
  PaginatedResponse,
} from '@/types/workingArea';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

export class WorkingAreaFolderService {
  /**
   * Create a new folder
   */
  static async createFolder(
    companyId: string,
    ownerId: string,
    request: CreateFolderRequest
  ): Promise<WorkingAreaFolder> {
    const { data, error } = await supabase
      .from('working_area_folders')
      .insert({
        company_id: companyId,
        owner_id: ownerId,
        parent_folder_id: request.parent_folder_id || null,
        name: request.name,
        color: request.color,
        icon: request.icon,
        is_shared: false,
        share_type: 'private'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create folder: ${error.message}`);

    // Log activity
    await WorkingAreaActivityService.logActivity(
      companyId,
      ownerId,
      'folder',
      data.id,
      'create',
      { folder_name: request.name }
    );

    return data;
  }

  /**
   * Get folder details with stats
   */
  static async getFolderWithStats(folderId: string, companyId: string): Promise<FolderWithStats> {
    const { data: folder, error: folderError } = await supabase
      .from('working_area_folders')
      .select('*')
      .eq('id', folderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (folderError) throw new Error(`Folder not found: ${folderError.message}`);

    // Get file count
    const { count: fileCount } = await supabase
      .from('working_area_files')
      .select('*', { count: 'exact', head: true })
      .eq('folder_id', folderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_current_version', true);

    // Get subfolder count
    const { count: subfolderCount } = await supabase
      .from('working_area_folders')
      .select('*', { count: 'exact', head: true })
      .eq('parent_folder_id', folderId)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    // Calculate folder size
    const { data: sizeData } = await supabase.rpc('calculate_folder_size', {
      p_folder_id: folderId,
      p_company_id: companyId
    });

    return {
      ...folder,
      file_count: fileCount || 0,
      subfolder_count: subfolderCount || 0,
      total_size: sizeData || 0
    };
  }

  /**
   * Get folder contents (files and subfolders)
   */
  static async getFolderContents(
    folderId: string,
    companyId: string,
    options?: {
      sort_by?: 'name' | 'modified' | 'size' | 'type';
      sort_order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<WorkingAreaFolder | WorkingAreaFile>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const sortBy = options?.sort_by || 'name';
    const sortOrder = options?.sort_order || 'asc';

    let query = supabase
      .from('working_area_folders')
      .select('*', { count: 'exact' })
      .eq('parent_folder_id', folderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' });

    if (limit > 0) query = query.limit(limit).range(offset, offset + limit - 1);

    const { data: folders, count: folderCount, error: folderError } = await query;

    if (folderError) throw new Error(`Failed to fetch folders: ${folderError.message}`);

    let fileQuery = supabase
      .from('working_area_files')
      .select('*', { count: 'exact' })
      .eq('folder_id', folderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_current_version', true)
      .order(sortBy === 'name' ? 'name' : sortBy === 'size' ? 'size_bytes' : 'created_at', {
        ascending: sortOrder === 'asc'
      });

    if (limit > 0) fileQuery = fileQuery.limit(limit).range(offset, offset + limit - 1);

    const { data: files, count: fileCount, error: fileError } = await fileQuery;

    if (fileError) throw new Error(`Failed to fetch files: ${fileError.message}`);

    const items = [...(folders || []), ...(files || [])];
    const total = (folderCount || 0) + (fileCount || 0);

    return {
      items,
      total,
      limit,
      offset,
      has_more: offset + limit < total
    };
  }

  /**
   * Update folder details
   */
  static async updateFolder(
    folderId: string,
    ownerId: string,
    companyId: string,
    request: UpdateFolderRequest
  ): Promise<WorkingAreaFolder> {
    const { data, error } = await supabase
      .from('working_area_folders')
      .update({
        ...request,
        updated_at: new Date().toISOString()
      })
      .eq('id', folderId)
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update folder: ${error.message}`);

    // Log activity
    await WorkingAreaActivityService.logActivity(
      companyId,
      ownerId,
      'folder',
      folderId,
      'update',
      request
    );

    return data;
  }

  /**
   * Move folder to a different parent
   */
  static async moveFolder(
    folderId: string,
    newParentId: string | null,
    ownerId: string,
    companyId: string
  ): Promise<WorkingAreaFolder> {
    const { data, error } = await supabase
      .from('working_area_folders')
      .update({
        parent_folder_id: newParentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', folderId)
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error) throw new Error(`Failed to move folder: ${error.message}`);

    // Log activity
    await WorkingAreaActivityService.logActivity(
      companyId,
      ownerId,
      'folder',
      folderId,
      'update',
      { action: 'moved', new_parent_id: newParentId }
    );

    return data;
  }

  /**
   * Delete folder (soft delete)
   */
  static async deleteFolder(
    folderId: string,
    ownerId: string,
    companyId: string
  ): Promise<void> {
    // Get folder details before deletion to ensure it exists
    const { error: fetchError } = await supabase
      .from('working_area_folders')
      .select('*', { count: 'exact', head: true })
      .eq('id', folderId)
      .single();

    if (fetchError) throw new Error(`Folder not found: ${fetchError.message}`);

    // Move to trash via function
    const { error } = await supabase.rpc('move_to_trash', {
      p_company_id: companyId,
      p_entity_type: 'folder',
      p_entity_id: folderId,
      p_deleted_by: ownerId
    });

    if (error) throw new Error(`Failed to delete folder: ${error.message}`);

    // Soft delete folder and all files within
    await supabase
      .from('working_area_folders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', folderId)
      .eq('owner_id', ownerId);

    // Also soft delete all files in this folder
    await supabase
      .from('working_area_files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('folder_id', folderId);
  }

  /**
   * Get folder path (breadcrumb trail)
   */
  static async getFolderPath(folderId: string): Promise<Array<{ id: string; name: string }>> {
    const path: Array<{ id: string; name: string }> = [];

    let currentId = folderId;
    while (currentId) {
      const { data, error } = await supabase
        .from('working_area_folders')
        .select('id, name, parent_folder_id')
        .eq('id', currentId)
        .single();

      if (error || !data) break;

      path.unshift({ id: data.id, name: data.name });
      currentId = data.parent_folder_id;
    }

    return path;
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

export class WorkingAreaFileService {
  /**
   * Upload file to Supabase storage and create metadata record
   */
  static async uploadFile(
    file: File,
    folderId: string,
    companyId: string,
    ownerId: string
  ): Promise<WorkingAreaFile> {
    const fileId = crypto.randomUUID();
    const fileName = `${fileId}_v1${this.getFileExtension(file.name)}`;
    const storagePath = `working-area/${companyId}/users/${ownerId}/${folderId}/${fileName}`;

    // Calculate checksum (simplified - in production use actual SHA-256)
    const checksum = await this.calculateChecksum(file);

    // Check for duplicates
    const { data: existingFiles } = await supabase
      .from('working_area_files')
      .select('*')
      .eq('folder_id', folderId)
      .eq('company_id', companyId)
      .eq('checksum', checksum)
      .eq('is_current_version', true)
      .is('deleted_at', null);

    if (existingFiles && existingFiles.length > 0) {
      throw new Error(`File with same content already exists: ${existingFiles[0].name}`);
    }

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('working-area')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Create file metadata record
    const { data, error: dbError } = await supabase
      .from('working_area_files')
      .insert({
        company_id: companyId,
        folder_id: folderId,
        owner_id: ownerId,
        name: file.name,
        original_name: file.name,
        file_type: file.type,
        file_extension: this.getFileExtension(file.name),
        size_bytes: file.size,
        storage_path: storagePath,
        version_number: 1,
        is_current_version: true,
        checksum: checksum,
        metadata: this.extractMetadata(file)
      })
      .select()
      .single();

    if (dbError) {
      // Clean up storage if DB insert fails
      await supabase.storage.from('working-area').remove([storagePath]);
      throw new Error(`Failed to create file record: ${dbError.message}`);
    }

    // Log activity
    await WorkingAreaActivityService.logActivity(
      companyId,
      ownerId,
      'file',
      data.id,
      'upload',
      { file_name: file.name, file_size: file.size }
    );

    return data;
  }

  /**
   * Download file
   */
  static async downloadFile(fileId: string, ownerId: string, companyId: string): Promise<string> {
    const { data: file, error: fetchError } = await supabase
      .from('working_area_files')
      .select('*')
      .eq('id', fileId)
      .eq('company_id', companyId)
      .eq('is_current_version', true)
      .single();

    if (fetchError) throw new Error(`File not found: ${fetchError.message}`);

    // Generate signed URL (1 hour expiration)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('working-area')
      .createSignedUrl(file.storage_path, 3600);

    if (urlError) throw new Error(`Failed to generate download URL: ${urlError.message}`);

    // Log activity
    await WorkingAreaActivityService.logActivity(
      companyId,
      ownerId,
      'file',
      fileId,
      'download',
      { file_name: file.name }
    );

    return signedUrl.signedUrl;
  }

  /**
   * Get file details
   */
  static async getFile(fileId: string, companyId: string): Promise<WorkingAreaFile> {
    const { data, error } = await supabase
      .from('working_area_files')
      .select('*')
      .eq('id', fileId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (error) throw new Error(`File not found: ${error.message}`);
    return data;
  }

  /**
   * Update file (rename, move)
   */
  static async updateFile(
    fileId: string,
    ownerId: string,
    companyId: string,
    updates: { name?: string; folder_id?: string }
  ): Promise<WorkingAreaFile> {
    const { data, error } = await supabase
      .from('working_area_files')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId)
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update file: ${error.message}`);

    // Log activity
    await WorkingAreaActivityService.logActivity(
      companyId,
      ownerId,
      'file',
      fileId,
      'update',
      updates
    );

    return data;
  }

  /**
   * Delete file (soft delete)
   */
  static async deleteFile(
    fileId: string,
    ownerId: string,
    companyId: string
  ): Promise<void> {
    // Move to trash
    const { error } = await supabase.rpc('move_to_trash', {
      p_company_id: companyId,
      p_entity_type: 'file',
      p_entity_id: fileId,
      p_deleted_by: ownerId
    });

    if (error) throw new Error(`Failed to delete file: ${error.message}`);

    // Soft delete
    await supabase
      .from('working_area_files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId)
      .eq('owner_id', ownerId);
  }

  /**
   * Get file version history
   */
  static async getFileVersions(fileId: string, companyId: string): Promise<WorkingAreaFile[]> {
    const { data, error } = await supabase
      .from('working_area_files')
      .select('*')
      .eq('id', fileId)
      .eq('company_id', companyId)
      .order('version_number', { ascending: false });

    if (error) throw new Error(`Failed to fetch versions: ${error.message}`);
    return data || [];
  }

  /**
   * Helper: Get file extension
   */
  private static getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot);
  }

  /**
   * Helper: Calculate file checksum
   */
  private static async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Helper: Extract metadata from file
   */
  private static extractMetadata(file: File): Record<string, any> {
    const metadata: Record<string, any> = {
      mime_type: file.type,
      uploaded_at: new Date().toISOString()
    };

    if (file.type.startsWith('image/')) {
      // Could extract dimensions via FileReader
      metadata.type = 'image';
    } else if (file.type.startsWith('video/')) {
      metadata.type = 'video';
    } else if (file.type.includes('pdf')) {
      metadata.type = 'document';
    }

    return metadata;
  }
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

export class WorkingAreaAccessService {
  /**
   * Grant access to folder
   */
  static async grantAccess(
    folderId: string,
    grantedBy: string,
    companyId: string,
    request: GrantAccessRequest
  ): Promise<WorkingAreaAccess[]> {
    const accessRecords: WorkingAreaAccess[] = [];

    // Grant to users
    if (request.user_ids && request.user_ids.length > 0) {
      for (const userId of request.user_ids) {
        const { data, error } = await supabase
          .from('working_area_access')
          .insert({
            folder_id: folderId,
            company_id: companyId,
            user_id: userId,
            permission_level: request.permission_level,
            granted_by: grantedBy,
            expires_at: request.expires_at || null
          })
          .select()
          .single();

        if (!error && data) accessRecords.push(data);
      }
    }

    // Grant to teams
    if (request.team_ids && request.team_ids.length > 0) {
      for (const teamId of request.team_ids) {
        const { data, error } = await supabase
          .from('working_area_access')
          .insert({
            folder_id: folderId,
            company_id: companyId,
            team_id: teamId,
            permission_level: request.permission_level,
            granted_by: grantedBy,
            expires_at: request.expires_at || null
          })
          .select()
          .single();

        if (!error && data) accessRecords.push(data);
      }
    }

    return accessRecords;
  }

  /**
   * Get access list for folder
   */
  static async getFolderAccess(folderId: string, companyId: string): Promise<AccessWithDetails[]> {
    const { data, error } = await supabase
      .from('working_area_access')
      .select(`
        *,
        user:user_id(id, email),
        team:team_id(id, name),
        granted_by_user:granted_by(email, full_name)
      `)
      .eq('folder_id', folderId)
      .eq('company_id', companyId);

    if (error) throw new Error(`Failed to fetch access list: ${error.message}`);
    return (data || []) as AccessWithDetails[];
  }

  /**
   * Revoke access
   */
  static async revokeAccess(accessId: string, companyId: string): Promise<void> {
    const { error } = await supabase
      .from('working_area_access')
      .delete()
      .eq('id', accessId)
      .eq('company_id', companyId);

    if (error) throw new Error(`Failed to revoke access: ${error.message}`);
  }

  /**
   * Check user permission
   */
  static async checkPermission(
    userId: string,
    folderId: string,
    companyId: string,
    requiredLevel: PermissionLevel
  ): Promise<boolean> {
    // First check if user owns the folder
    const { data: folder } = await supabase
      .from('working_area_folders')
      .select('owner_id')
      .eq('id', folderId)
      .eq('company_id', companyId)
      .single();

    if (folder?.owner_id === userId) return true;

    // Check explicit access
    const { data: access } = await supabase
      .from('working_area_access')
      .select('permission_level')
      .eq('folder_id', folderId)
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (!access) return false;

    // Compare permission levels (admin > edit > upload > download > view)
    const levels = ['view', 'download', 'upload', 'edit', 'admin'] as const;
    const userLevelIndex = levels.indexOf(access.permission_level as PermissionLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  }
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

export class WorkingAreaActivityService {
  /**
   * Log activity
   */
  static async logActivity(
    companyId: string,
    userId: string,
    entityType: EntityType,
    entityId: string,
    action: ActionType,
    metadata?: Record<string, any>
  ): Promise<WorkingAreaActivityLog> {
    const { data, error } = await supabase
      .from('working_area_activity_log')
      .insert({
        company_id: companyId,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) console.error('Failed to log activity:', error);
    return data;
  }

  /**
   * Get activity log
   */
  static async getActivityLog(
    companyId: string,
    filters?: ActivityFilter
  ): Promise<PaginatedResponse<WorkingAreaActivityLog>> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let query = supabase
      .from('working_area_activity_log')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, count, error } = await query.limit(limit).range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch activity log: ${error.message}`);

    return {
      items: data || [],
      total: count || 0,
      limit,
      offset,
      has_more: (offset + limit) < (count || 0)
    };
  }
}

// ============================================================================
// TRASH & RECOVERY
// ============================================================================

export class WorkingAreaTrashService {
  /**
   * Get user trash items
   */
  static async getUserTrash(userId: string, companyId: string, limit = 50, offset = 0): Promise<PaginatedResponse<WorkingAreaTrash>> {
    const { data, count, error } = await supabase
      .from('working_area_trash')
      .select('*', { count: 'exact' })
      .eq('deleted_by', userId)
      .eq('company_id', companyId)
      .order('deleted_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch trash: ${error.message}`);

    return {
      items: data || [],
      total: count || 0,
      limit,
      offset,
      has_more: (offset + limit) < (count || 0)
    };
  }

  /**
   * Restore from trash
   */
  static async restoreFromTrash(
    trashId: string,
    userId: string,
    companyId: string
  ): Promise<void> {
    // Get trash item
    const { data: trash, error: fetchError } = await supabase
      .from('working_area_trash')
      .select('*')
      .eq('id', trashId)
      .single();

    if (fetchError) throw new Error(`Trash item not found: ${fetchError.message}`);

    // Restore entity
    if (trash.entity_type === 'folder') {
      await supabase
        .from('working_area_folders')
        .update({ deleted_at: null })
        .eq('id', trash.entity_id);
    } else if (trash.entity_type === 'file') {
      await supabase
        .from('working_area_files')
        .update({ deleted_at: null })
        .eq('id', trash.entity_id);
    }

    // Remove from trash
    await supabase
      .from('working_area_trash')
      .delete()
      .eq('id', trashId);

    // Log activity
    await WorkingAreaActivityService.logActivity(
      companyId,
      userId,
      trash.entity_type,
      trash.entity_id,
      'restore',
      { restored_from_trash: true }
    );
  }

  /**
   * Permanently delete from trash
   */
  static async permanentlyDelete(
    trashId: string,
    userId: string,
    companyId: string
  ): Promise<void> {
    const { data: trash, error: fetchError } = await supabase
      .from('working_area_trash')
      .select('*')
      .eq('id', trashId)
      .eq('deleted_by', userId)
      .eq('company_id', companyId)
      .single();

    if (fetchError) throw new Error(`Trash item not found: ${fetchError.message}`);

    // Delete from database
    if (trash.entity_type === 'folder') {
      await supabase
        .from('working_area_folders')
        .delete()
        .eq('id', trash.entity_id)
        .eq('company_id', companyId);
    } else if (trash.entity_type === 'file') {
      // Also delete from storage
      const { data: file } = await supabase
        .from('working_area_files')
        .select('storage_path')
        .eq('id', trash.entity_id)
        .eq('company_id', companyId)
        .single();

      if (file?.storage_path) {
        await supabase.storage.from('working-area').remove([file.storage_path]);
      }

      await supabase
        .from('working_area_files')
        .delete()
        .eq('id', trash.entity_id)
        .eq('company_id', companyId);
    }

    // Remove from trash
    await supabase
      .from('working_area_trash')
      .delete()
      .eq('id', trashId)
      .eq('company_id', companyId);
  }
}

// ============================================================================
// FAVORITES
// ============================================================================

export class WorkingAreaFavoriteService {
  /**
   * Add favorite
   */
  static async addFavorite(
    userId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<WorkingAreaFavorite> {
    const { data, error } = await supabase
      .from('working_area_favorites')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add favorite: ${error.message}`);
    return data;
  }

  /**
   * Remove favorite
   */
  static async removeFavorite(
    userId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('working_area_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) throw new Error(`Failed to remove favorite: ${error.message}`);
  }

  /**
   * Get user favorites
   */
  static async getUserFavorites(userId: string): Promise<WorkingAreaFavorite[]> {
    const { data, error } = await supabase
      .from('working_area_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch favorites: ${error.message}`);
    return data || [];
  }
}

// ============================================================================
// SEARCH
// ============================================================================

export class WorkingAreaSearchService {
  /**
   * Search files and folders
   */
  static async search(query: SearchQuery, companyId: string): Promise<SearchResult[]> {
    let fileQuery = supabase
      .from('working_area_files')
      .select('id, name, folder_id, owner_id, size_bytes, created_at, file_type')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .ilike('name', `%${query.q}%`);

    if (query.folder_id) {
      fileQuery = fileQuery.eq('folder_id', query.folder_id);
    }

    if (query.filters?.file_type && query.filters.file_type.length > 0) {
      fileQuery = fileQuery.in('file_extension', query.filters.file_type);
    }

    if (query.filters?.min_size) {
      fileQuery = fileQuery.gte('size_bytes', query.filters.min_size);
    }

    if (query.filters?.max_size) {
      fileQuery = fileQuery.lte('size_bytes', query.filters.max_size);
    }

    if (query.filters?.date_from) {
      fileQuery = fileQuery.gte('created_at', query.filters.date_from);
    }

    if (query.filters?.date_to) {
      fileQuery = fileQuery.lte('created_at', query.filters.date_to);
    }

    const { data: files } = await fileQuery.limit(query.limit || 50).range(query.offset || 0, (query.offset || 0) + (query.limit || 50) - 1);

    // TODO: Add folder search similar to file search

    return (files || []).map(f => ({
      type: 'file' as const,
      id: f.id,
      name: f.name,
      path: `file://${f.id}`,
      relevance_score: 1,
      created_at: f.created_at,
      size_bytes: f.size_bytes,
      owner_id: f.owner_id
    }));
  }
}

// ============================================================================
// STORAGE QUOTA
// ============================================================================

export class WorkingAreaQuotaService {
  static readonly QUOTAS = {
    free: 5 * 1024 * 1024 * 1024, // 5GB
    pro: 50 * 1024 * 1024 * 1024, // 50GB
    enterprise: -1 // Unlimited
  };

  /**
   * Get user storage quota
   */
  static async getStorageQuota(userId: string, companyId: string): Promise<StorageQuota> {
    // Get user tier from company/subscription (simplified)
    const { data: user } = await supabase
      .from('users')
      .select('storage_tier')
      .eq('id', userId)
      .eq('company_id', companyId)
      .single();

    const tier = user?.storage_tier || 'free';
    const totalBytes = this.QUOTAS[tier as keyof typeof this.QUOTAS] || this.QUOTAS.free;

    // Calculate used storage
    const { data: fileData } = await supabase.rpc('get_user_storage_usage', {
      p_user_id: userId,
      p_company_id: companyId
    });

    const usedBytes = fileData || 0;

    return {
      user_id: userId,
      company_id: companyId,
      total_bytes: totalBytes,
      used_bytes: usedBytes,
      available_bytes: totalBytes === -1 ? -1 : totalBytes - usedBytes,
      percentage_used: totalBytes === -1 ? 0 : (usedBytes / totalBytes) * 100
    };
  }

  /**
   * Check if user has enough storage for file
   */
  static async canUploadFile(userId: string, companyId: string, fileSizeBytes: number): Promise<boolean> {
    const quota = await this.getStorageQuota(userId, companyId);
    return quota.available_bytes === -1 || quota.available_bytes >= fileSizeBytes;
  }
}

export default {
  folders: WorkingAreaFolderService,
  files: WorkingAreaFileService,
  access: WorkingAreaAccessService,
  activity: WorkingAreaActivityService,
  trash: WorkingAreaTrashService,
  favorites: WorkingAreaFavoriteService,
  search: WorkingAreaSearchService,
  quota: WorkingAreaQuotaService
};
