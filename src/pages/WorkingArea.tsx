/**
 * Working Area Feature - Main Component
 * Personal workspace and file management system
 * Fully integrated with Supabase and SQL schema
 */

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { ChevronRight, Upload, Plus, Grid3X3, List, Search, Trash2, Star, FolderOpen, X, Home, Eye, Download as DownloadIcon, File as FileIcon, ArrowUpDown, FileText, FileSpreadsheet, Presentation, Image as ImageIcon, Archive, Code, Edit2, Save, Filter, Edit3 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { getFileTypeConfig, isPreviewable, getPreviewType } from '@/lib/fileTypeConfig';
import { PreviewModal } from '@/components/PreviewModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type {
  WorkingAreaContextType,
  WorkingAreaState,
  EntityType,
} from '@/types/workingArea';

// ============================================================================
// CONTEXT
// ============================================================================

const WorkingAreaContext = createContext<WorkingAreaContextType | undefined>(undefined);

export const useWorkingArea = () => {
  const context = useContext(WorkingAreaContext);
  if (!context) {
    throw new Error('useWorkingArea must be used within WorkingAreaProvider');
  }
  return context;
};


// ============================================================================
// WORKING AREA PAGE COMPONENT
// ============================================================================

interface WorkingAreaPageProps {
  onFolderSelect?: (folderId: string) => void;
}

export const WorkingAreaPage: React.FC<WorkingAreaPageProps> = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [state, setState] = useState<WorkingAreaState>({
    current_folder_id: null,
    breadcrumbs: [],
    items: [],
    selected_items: new Set(),
    view_mode: 'grid',
    sort_by: 'name',
    sort_order: 'asc',
    is_loading: false,
    error: null,
    filter: {}
  });

  const [showTrash, setShowTrash] = useState(false);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterByType, setFilterByType] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    isUploading: boolean;
    files: Array<{
      name: string;
      progress: number;
      status: 'uploading' | 'success' | 'error';
      error?: string;
    }>;
  }>({
    isUploading: false,
    files: []
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchRootFolders = useCallback(async () => {
    if (!user?.id || !user?.company_id) return;

    setState(prev => ({ ...prev, is_loading: true, error: null }));

    try {
      // Fetch root folders for the user
      const { data: folders, error: foldersError } = await supabase
        .from('working_area_folders')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('owner_id', user.id)
        .is('parent_folder_id', null)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (foldersError) throw foldersError;

      // Fetch root level files (only files with folder_id IS NULL)
      const { data: files, error: filesError } = await supabase
        .from('working_area_files')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('owner_id', user.id)
        .is('folder_id', null)
        .eq('is_current_version', true)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (filesError) throw filesError;

      const items = [
        ...(folders || []).map(f => ({ ...f, is_folder: true })),
        ...(files || []).map(f => ({ ...f, is_folder: false }))
      ];

      setState(prev => ({
        ...prev,
        current_folder_id: null,
        breadcrumbs: [{ id: '', name: 'My Files' }],
        items,
        is_loading: false
      }));
    } catch (error) {
      const message = (error as Error).message;
      setState(prev => ({
        ...prev,
        is_loading: false,
        error: message
      }));
      toast.error(message);
    }
  }, [user?.id, user?.company_id]);

  const fetchTrashItems = useCallback(async () => {
    if (!user?.id || !user?.company_id) return;

    setState(prev => ({ ...prev, is_loading: true, error: null }));

    try {
      // Fetch deleted folders
      const { data: folders, error: foldersError } = await supabase
        .from('working_area_folders')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('owner_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (foldersError) throw foldersError;

      // Fetch deleted files
      const { data: files, error: filesError } = await supabase
        .from('working_area_files')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('owner_id', user.id)
        .eq('is_current_version', true)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (filesError) throw filesError;

      const items = [
        ...(folders || []).map(f => ({ ...f, is_folder: true })),
        ...(files || []).map(f => ({ ...f, is_folder: false }))
      ];

      setState(prev => ({
        ...prev,
        current_folder_id: null,
        breadcrumbs: [{ id: '', name: 'Trash' }],
        items,
        is_loading: false
      }));
    } catch (error) {
      const message = (error as Error).message;
      setState(prev => ({
        ...prev,
        is_loading: false,
        error: message
      }));
      toast.error(message);
    }
  }, [user?.id, user?.company_id]);

  const navigateToFolder = useCallback(async (folderId: string) => {
    if (!user?.id || !user?.company_id) return;

    setState(prev => ({ ...prev, is_loading: true, error: null }));

    try {
      // Get folder details
      const { data: folder, error: folderError } = await supabase
        .from('working_area_folders')
        .select('*')
        .eq('id', folderId)
        .is('deleted_at', null)
        .single();

      if (folderError) throw folderError;

      // Build breadcrumb path
      const breadcrumbs = [{ id: '', name: 'My Files' }];
      let currentId: string | null = folderId;

      while (currentId) {
        const { data: f, error: e }: { data: { id: string; name: string; parent_folder_id: string | null } | null; error: Error | null } = await supabase
          .from('working_area_folders')
          .select('id, name, parent_folder_id')
          .eq('id', currentId)
          .is('deleted_at', null)
          .single();

        if (e || !f) break;
        breadcrumbs.unshift({ id: f.id, name: f.name });
        currentId = f.parent_folder_id;
      }

      // Fetch folder contents
      const { data: subfolders, error: subfoldersError } = await supabase
        .from('working_area_folders')
        .select('*')
        .eq('parent_folder_id', folderId)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (subfoldersError) throw subfoldersError;

      const { data: folderFiles, error: filesError } = await supabase
        .from('working_area_files')
        .select('*')
        .eq('folder_id', folderId)
        .is('deleted_at', null)
        .eq('is_current_version', true)
        .order('name', { ascending: true });

      if (filesError) throw filesError;

      const items: Array<{ is_folder: boolean } & (typeof subfolders extends Array<infer T> ? T : never)> = [
        ...(subfolders || []).map((f: any) => ({ ...f, is_folder: true })),
        ...(folderFiles || []).map((f: any) => ({ ...f, is_folder: false }))
      ] as any;

      setState(prev => ({
        ...prev,
        current_folder_id: folderId,
        breadcrumbs,
        items,
        is_loading: false,
        selected_items: new Set()
      }));
    } catch (error) {
      const message = (error as Error).message;
      setState(prev => ({
        ...prev,
        is_loading: false,
        error: message
      }));
      toast.error(message);
    }
  }, [user?.id, user?.company_id]);

  // ============================================================================
  // FOLDER OPERATIONS
  // ============================================================================

  const createFolder = useCallback(async (name: string) => {
    if (!user?.id || !user?.company_id || !name.trim()) return;

    try {
      const { data: newFolder, error } = await supabase
        .from('working_area_folders')
        .insert({
          company_id: user.company_id,
          owner_id: user.id,
          parent_folder_id: state.current_folder_id,
          name: name.trim(),
          is_shared: false,
          share_type: 'private'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Folder created successfully');
      
      // Auto-navigate into the newly created folder
      if (newFolder?.id) {
        await navigateToFolder(newFolder.id);
      }
    } catch (error) {
      const message = (error as Error).message;
      toast.error(message);
    }
  }, [user?.id, user?.company_id, state.current_folder_id, navigateToFolder]);

  const goBack = useCallback(async () => {
    if (state.breadcrumbs.length > 1) {
      const parentId = state.breadcrumbs[state.breadcrumbs.length - 2]?.id;
      if (!parentId || parentId === '') {
        await fetchRootFolders();
      } else {
        await navigateToFolder(parentId);
      }
    }
  }, [state.breadcrumbs, fetchRootFolders, navigateToFolder]);

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  const uploadFiles = useCallback(async (files: FileList) => {
    if (!user?.id || !user?.company_id) return;

    // Prevent file uploads at root level
    if (!state.current_folder_id) {
      toast.error('Please create or select a folder first to upload files');
      return;
    }

    const targetFolderId = state.current_folder_id;
    const fileArray = Array.from(files);

    // Initialize upload progress
    setUploadProgress({
      isUploading: true,
      files: fileArray.map(file => ({
        name: file.name,
        progress: 0,
        status: 'uploading' as const
      }))
    });

    // Upload files sequentially with progress tracking
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileId = crypto.randomUUID();

      try {
        // Update progress: starting upload (10%)
        setUploadProgress(prev => ({
          ...prev,
          files: prev.files.map((f, idx) => 
            idx === i ? { ...f, progress: 10, status: 'uploading' } : f
          )
        }));

        // Upload to Supabase Storage
        const storagePath = `${user.company_id}/${user.id}/${fileId}-${file.name}`;
        
        // Simulate progress during upload (Supabase doesn't provide progress callbacks)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            files: prev.files.map((f, idx) => 
              idx === i && f.progress < 80 
                ? { ...f, progress: Math.min(f.progress + 10, 80) } 
                : f
            )
          }));
        }, 200);

        const { error: uploadError } = await supabase.storage
          .from('working-area-files')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false
          });

        clearInterval(progressInterval);

        if (uploadError) throw uploadError;

        // Update progress: upload complete, saving to database (85%)
        setUploadProgress(prev => ({
          ...prev,
          files: prev.files.map((f, idx) => 
            idx === i ? { ...f, progress: 85, status: 'uploading' } : f
          )
        }));

        // Create file record in database
        const { error: dbError } = await supabase
          .from('working_area_files')
          .insert({
            company_id: user.company_id,
            folder_id: targetFolderId,
            owner_id: user.id,
            name: file.name,
            original_name: file.name,
            file_type: file.type,
            file_extension: file.name.split('.').pop(),
            size_bytes: file.size,
            storage_path: storagePath,
            version_number: 1,
            is_current_version: true,
            checksum: fileId
          });

        if (dbError) throw dbError;

        // Update progress: complete (100%)
        setUploadProgress(prev => ({
          ...prev,
          files: prev.files.map((f, idx) => 
            idx === i ? { ...f, progress: 100, status: 'success' } : f
          )
        }));
      } catch (error) {
        const message = (error as Error).message;
        // Update progress: error
        setUploadProgress(prev => ({
          ...prev,
          files: prev.files.map((f, idx) => 
            idx === i ? { ...f, progress: 0, status: 'error', error: message } : f
          )
        }));
      }
    }

    // Wait a bit to show completion, then close and refresh
    setTimeout(() => {
      setUploadProgress({ isUploading: false, files: [] });
      
      // Refresh folder
      if (state.current_folder_id) {
        navigateToFolder(state.current_folder_id);
      }
    }, 1500);
  }, [user?.id, user?.company_id, state.current_folder_id, navigateToFolder]);

  const deleteItem = useCallback(async (type: EntityType, id: string) => {
    if (!user?.id || !user?.company_id) return;

    try {
      const tableName = type === 'folder' ? 'working_area_folders' : 'working_area_files';
      
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success(`${type === 'folder' ? 'Folder' : 'File'} deleted successfully`);

      // Refresh
      if (state.current_folder_id) {
        await navigateToFolder(state.current_folder_id);
      } else {
        await fetchRootFolders();
      }
    } catch (error) {
      const message = (error as Error).message;
      toast.error(message);
    }
  }, [user?.id, user?.company_id, state.current_folder_id, navigateToFolder, fetchRootFolders]);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    if (!user?.id || !user?.company_id) return;
    
    if (!newName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('working_area_folders')
        .update({ name: newName.trim() })
        .eq('id', folderId);

      if (error) throw error;

      toast.success('Folder renamed successfully');

      // Refresh
      if (state.current_folder_id) {
        await navigateToFolder(state.current_folder_id);
      } else {
        await fetchRootFolders();
      }
    } catch (error) {
      const message = (error as Error).message;
      toast.error(`Rename failed: ${message}`);
    }
  }, [user?.id, user?.company_id, state.current_folder_id, navigateToFolder, fetchRootFolders]);

  const downloadFile = useCallback(async (item: any) => {
    if (!item.storage_path) return;

    try {
      // Generate a signed URL (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from('working-area-files')
        .createSignedUrl(item.storage_path, 3600);

      if (error) throw error;

      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = item.name;
      link.click();

      toast.success(`Downloading ${item.name}...`);
    } catch (error) {
      const message = (error as Error).message;
      toast.error(`Download failed: ${message}`);
    }
  }, []);

  const previewFile = useCallback(async (item: any) => {
    if (!item.storage_path) return;

    // Check if file is previewable
    if (!isPreviewable(item.name, item.file_type)) {
      toast.error('Preview not available for this file type');
      return;
    }

    setPreviewItem(item);
    setShowPreview(true);
  }, []);

  const getSignedUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('working-area-files')
      .createSignedUrl(path, 3600);

    if (error) throw error;
    return data.signedUrl;
  };

  // ============================================================================
  // SELECTION OPERATIONS
  // ============================================================================

  const toggleSelect = useCallback((id: string) => {
    setState(prev => {
      const newSet = new Set(prev.selected_items);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { ...prev, selected_items: newSet };
    });
  }, []);

  const selectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selected_items: new Set(prev.items.map(item => item.id))
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selected_items: new Set()
    }));
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchRootFolders();
  }, [fetchRootFolders]);

  useEffect(() => {
    if (showTrash) {
      fetchTrashItems();
    } else {
      fetchRootFolders();
    }
  }, [showTrash, fetchTrashItems, fetchRootFolders]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: WorkingAreaContextType = {
    state,
    actions: {
      navigateToFolder,
      goBack,
      createFolder,
      uploadFiles: (files: File[]) => uploadFiles(files as any as FileList),
      deleteItem,
      shareFolder: async () => {},
      restoreFromTrash: async () => {},
      toggleFavorite: async () => {},
      selectItem: () => {},
      deselectItem: () => {},
      selectAll,
      deselectAll,
      setViewMode: (mode) => setState(prev => ({ ...prev, view_mode: mode })),
      setSortBy: (sort) => setState(prev => ({ ...prev, sort_by: sort }))
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Sort and filter items
  const sortedAndFilteredItems = React.useMemo(() => {
    let items: any[] = [...state.items].map(item => ({ ...item, is_folder: 'is_folder' in item ? (item as any).is_folder : false }));
    
    // Filter by type
    if (filterByType && filterByType !== 'all') {
      items = items.filter(item => {
        if ((item as any).is_folder) return filterByType === 'folder';
        const config = getFileTypeConfig(item.name, (item as any).file_type);
        // Match by file type category
        const typeMap: { [key: string]: string[] } = {
          'word': ['word document'],
          'excel': ['excel file', 'csv file'],
          'powerpoint': ['powerpoint'],
          'pdf': ['pdf document'],
          'image': ['image'],
          'code': ['code file'],
          'archive': ['archive'],
        };
        const matchingTypes = typeMap[filterByType] || [];
        return matchingTypes.some(type => config.label.toLowerCase().includes(type));
      });
    }
    
    // Sort items
    items.sort((a: any, b: any) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'type') {
        if (a.is_folder && !b.is_folder) comparison = -1;
        else if (!a.is_folder && b.is_folder) comparison = 1;
        else if (!a.is_folder && !b.is_folder) {
          const aConfig = getFileTypeConfig(a.name, a.file_type);
          const bConfig = getFileTypeConfig(b.name, b.file_type);
          comparison = aConfig.label.localeCompare(bConfig.label);
        }
      } else if (sortBy === 'date') {
        const aDate = new Date(a.created_at || a.updated_at || 0).getTime();
        const bDate = new Date(b.created_at || b.updated_at || 0).getTime();
        comparison = aDate - bDate;
      } else if (sortBy === 'size') {
        const aSize = a.is_folder ? 0 : (a.size_bytes || 0);
        const bSize = b.is_folder ? 0 : (b.size_bytes || 0);
        comparison = aSize - bSize;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return items;
  }, [state.items, sortBy, sortOrder, filterByType]);

  // Check if file is editable
  const isEditable = (item: any): boolean => {
    if (item.is_folder) return false;
    const extension = item.name.split('.').pop()?.toLowerCase();
    return ['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'csv', 'tsv', 'ppt', 'pptx'].includes(extension || '');
  };

  // Open file for editing
  const openForEditing = useCallback(async (item: any) => {
    if (!item.storage_path) return;
    
    try {
      const signedUrl = await getSignedUrl(item.storage_path);
      setEditingFile({ ...item, signedUrl });
      setShowEditModal(true);
    } catch (error) {
      toast.error('Failed to open file for editing');
    }
  }, [getSignedUrl]);

  return (
    <WorkingAreaContext.Provider value={contextValue}>
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-0">
        {/* Header */}
        <div className="space-y-1 lg:space-y-2 px-4 sm:px-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground break-words">File Management</h1>
          </div>
          <p className="text-muted-foreground flex items-center gap-1 text-xs sm:text-sm lg:text-base">
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Organize and manage your files and folders</span>
          </p>
        </div>

        {/* Breadcrumb Navigation */}
        {state.breadcrumbs.length > 0 && (
          <nav 
            className="flex items-center gap-1 text-xs sm:text-sm px-4 sm:px-0 overflow-x-auto pb-2 scrollbar-hide"
            aria-label="Breadcrumb navigation"
          >
            <ol className="flex items-center gap-0.5 sm:gap-1 min-w-max">
              {state.breadcrumbs.map((crumb, index) => {
                const isLast = index === state.breadcrumbs.length - 1;
                const isRoot = index === 0 && crumb.id === '';
                
                return (
                  <li key={index} className="flex items-center gap-0.5 sm:gap-1 min-w-max">
                    {index > 0 && (
                      <ChevronRight 
                        size={16} 
                        className="text-slate-300 dark:text-slate-600 flex-shrink-0 mx-0.5 sm:mx-1" 
                        aria-hidden="true"
                      />
                    )}
                    
                    <button
                      onClick={() => {
                        if (crumb.id === '') {
                          fetchRootFolders();
                        } else {
                          navigateToFolder(crumb.id);
                        }
                      }}
                      className={`
                        group relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md 
                        transition-all duration-200 font-medium whitespace-nowrap max-w-[120px] sm:max-w-[180px] truncate
                        ${isLast
                          ? 'bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold cursor-default shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }
                      `}
                      title={crumb.name}
                      disabled={isLast}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {isRoot && (
                        <Home 
                          size={14} 
                          className={`flex-shrink-0 ${
                            isLast 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                          }`}
                        />
                      )}
                      <span className="truncate">{crumb.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Main Content Area */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6 px-4 sm:px-0">
          {/* Folder Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 sm:p-4 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex-shrink-0">
                <FolderOpen size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {state.current_folder_id ? state.breadcrumbs[state.breadcrumbs.length - 1]?.name || 'Folder' : 'My Files'}
                </p>
                <p className="text-xs text-slate-500 dark:text-white mt-0.5">
                  {state.items.filter((i: any) => i.is_folder).length} folder{state.items.filter((i: any) => i.is_folder).length !== 1 ? 's' : ''} • {state.items.filter((i: any) => !i.is_folder).length} file{state.items.filter((i: any) => !i.is_folder).length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 sm:p-2.5 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-all shadow-sm flex-1 sm:flex-none"
                title="Toggle view"
              >
                {viewMode === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
              </button>

              <button
                onClick={() => setShowTrash(!showTrash)}
                className={`p-2 sm:p-2.5 rounded-lg transition-all shadow-sm flex-1 sm:flex-none ${showTrash ? 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800' : 'bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                title="Trash"
              >
                <Trash2 size={18} />
              </button>
              
              {state.current_folder_id && (
                <button
                  onClick={fetchRootFolders}
                  className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all text-xs sm:text-sm font-medium shadow-sm flex-1 sm:flex-none"
                  title="Back to root"
                >
                  <Home size={16} />
                  <span className="hidden sm:inline">Root</span>
                </button>
              )}
            </div>
          </div>

          {/* Search and Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {/* Search Bar */}
                <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Search size={16} className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-8"
                >
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                </select>

                {/* Sort Order Toggle */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`p-2 sm:p-2.5 border rounded-lg transition-all shadow-sm ${
                    sortOrder === 'asc'
                      ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      : 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  }`}
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <ArrowUpDown size={16} className={`transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!state.current_folder_id}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all font-medium text-xs sm:text-sm ${
                    state.current_folder_id
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">Upload</span>
                </button>

                {!showNewFolderInput ? (
                  <button
                    onClick={() => {
                      setShowNewFolderInput(true);
                      setNewFolderName('');
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all font-medium text-xs sm:text-sm shadow-sm"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">New Folder</span>
                    <span className="sm:hidden">Folder</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                    <input
                      type="text"
                      placeholder="Folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          createFolder(newFolderName.trim());
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        } else if (e.key === 'Escape') {
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }
                      }}
                      className="flex-1 px-2 py-1.5 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 min-w-[120px]"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (newFolderName.trim()) {
                          createFolder(newFolderName.trim());
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        } else {
                          toast.error('Folder name cannot be empty');
                        }
                      }}
                      className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-all"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }}
                      className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition-all"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {state.error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
              <span className="text-xs sm:text-sm font-medium">{state.error}</span>
              <button 
                onClick={() => setState(prev => ({ ...prev, error: null }))} 
                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 active:scale-95 transition-transform ml-2"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Content Grid/List */}
          <div className="w-full">
            {state.is_loading ? (
              <LoadingState />
            ) : state.items.length === 0 ? (
              <EmptyState 
                createFolder={createFolder} 
                isFolderView={state.current_folder_id !== null}
              />
            ) : viewMode === 'grid' ? (
              <GridView 
                items={sortedAndFilteredItems.filter(item => 
                  item.name.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                onSelect={toggleSelect}
                selected={state.selected_items}
                onDelete={deleteItem}
                onNavigateFolder={(folderId) => navigateToFolder(folderId)}
                onDownload={downloadFile}
                onPreview={previewFile}
                onEdit={openForEditing}
                onRename={renameFolder}
                isEditable={isEditable}
                searchQuery={searchQuery}
              />
            ) : (
              <ListView 
                items={sortedAndFilteredItems.filter(item => 
                  item.name.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                onSelect={toggleSelect}
                selected={state.selected_items}
                onDelete={deleteItem}
                onNavigateFolder={(folderId) => navigateToFolder(folderId)}
                onDownload={downloadFile}
                onPreview={previewFile}
                onEdit={openForEditing}
                onRename={renameFolder}
                isEditable={isEditable}
                searchQuery={searchQuery}
              />
            )}
          </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {/* Preview Modal */}
      {previewItem && (
        <PreviewModal
          isOpen={showPreview}
          item={previewItem}
          onClose={() => setShowPreview(false)}
          getSignedUrl={getSignedUrl}
        />
      )}

      {/* Edit File Modal for Office Documents */}
      {editingFile && showEditModal && (
        <EditFileModal
          isOpen={showEditModal}
          file={editingFile}
          onClose={() => {
            setShowEditModal(false);
            setEditingFile(null);
          }}
          onSave={async (updatedFile: File) => {
            // Save the edited file
            try {
              await uploadFiles([updatedFile] as any);
              toast.success('File saved successfully');
              setShowEditModal(false);
              setEditingFile(null);
              // Refresh the current folder
              if (state.current_folder_id) {
                await navigateToFolder(state.current_folder_id);
              } else {
                await fetchRootFolders();
              }
            } catch (error) {
              toast.error('Failed to save file');
            }
          }}
          getSignedUrl={getSignedUrl}
        />
      )}

      {/* Upload Progress Modal */}
      {uploadProgress.isUploading && (
        <UploadProgressModal
          files={uploadProgress.files}
          onClose={() => {
            // Only allow closing if all files are done (success or error)
            const allDone = uploadProgress.files.every(
              f => f.status === 'success' || f.status === 'error'
            );
            if (allDone) {
              setUploadProgress({ isUploading: false, files: [] });
            }
          }}
        />
      )}
    </WorkingAreaContext.Provider>
  );
};

// Upload Progress Modal Component
const UploadProgressModal: React.FC<{
  files: Array<{
    name: string;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  }>;
  onClose: () => void;
}> = ({ files, onClose }) => {
  const totalFiles = files.length;
  const completedFiles = files.filter(f => f.status === 'success').length;
  const errorFiles = files.filter(f => f.status === 'error').length;
  const overallProgress = files.reduce((sum, f) => sum + f.progress, 0) / totalFiles;

  const allDone = files.every(f => f.status === 'success' || f.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={allDone ? onClose : undefined}>
      <div 
        className="relative w-full max-w-lg mx-4 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload size={24} className="text-blue-600 dark:text-blue-400" />
              Uploading Files
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-white mt-1">
              {completedFiles} of {totalFiles} files completed
            </p>
          </div>
          {allDone && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 ml-4"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Overall Progress Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${overallProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </div>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-h-96">
          <div className="space-y-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    {file.status === 'error' && file.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {file.error}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {file.status === 'uploading' && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {Math.round(file.progress)}%
                        </span>
                      </div>
                    )}
                    {file.status === 'success' && (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <X size={12} className="rotate-45" />
                        </div>
                        <span className="text-xs font-semibold">Done</span>
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <X size={16} />
                        <span className="text-xs font-semibold">Failed</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Individual File Progress Bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ease-out ${
                      file.status === 'success'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                        : file.status === 'error'
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {allDone && (
          <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {errorFiles === 0 
                    ? `All ${totalFiles} files uploaded successfully!`
                    : `${completedFiles} uploaded, ${errorFiles} failed`
                  }
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all font-semibold text-sm shadow-md hover:shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Edit File Modal Component
const EditFileModal: React.FC<{
  isOpen: boolean;
  file: any;
  onClose: () => void;
  onSave: (file: File) => void;
  getSignedUrl: (path: string) => Promise<string>;
}> = ({ isOpen, file, onClose, onSave, getSignedUrl }) => {
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const getEditUrl = (url: string, fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Use Microsoft Office Online for editing
    if (['doc', 'docx', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx'].includes(extension || '')) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}&wdStartOn=1&wdEmbedCode=0`;
    }
    
    // For CSV, use Google Sheets
    if (extension === 'csv' || extension === 'tsv') {
      return `https://docs.google.com/spreadsheets/d/1/edit?usp=drive_web&rm=minimal&url=${encodeURIComponent(url)}`;
    }
    
    return url;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // For Office Online, we need to download the edited version
      // Note: This is a simplified approach - full implementation would use Office Online APIs
      const response = await fetch(file.signedUrl);
      const blob = await response.blob();
      const editedFile = new File([blob], file.name, { type: file.file_type || 'application/octet-stream' });
      await onSave(editedFile);
    } catch (error) {
      toast.error('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-[95vw] h-[95vh] mx-4 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white truncate flex items-center gap-2">
              <Edit2 size={20} className="text-emerald-600 dark:text-emerald-400" />
              Editing: {file.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-white mt-1">
              Make your changes and save when done
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden">
          {file.signedUrl && (
            <iframe
              ref={iframeRef}
              src={getEditUrl(file.signedUrl, file.name)}
              className="w-full h-full border-none"
              title={`Editing ${file.name}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

const WorkingAreaSidebar: React.FC = () => {
  const { actions, state } = useWorkingArea();
  const { user } = useAuth();

  const handleHomeClick = async () => {
    // Fetch root folders instead of navigating to empty folder
    if (state.breadcrumbs.length > 1) {
      await actions.goBack();
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Files</h2>

      <nav className="space-y-2 flex-1">
        <SidebarItem 
          icon={<Home size={20} />} 
          label="My Files"
          onClick={handleHomeClick}
        />
        <SidebarItem icon={<Star size={20} />} label="Favorites" />
        <SidebarItem icon={<Trash2 size={20} />} label="Trash" />
      </nav>

      {user && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Storage</div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }} />
          </div>
          <div className="text-xs text-slate-600 dark:text-white mt-1">4.5 GB / 10 GB</div>
        </div>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const WorkingAreaHeader: React.FC<{
  showTrash: boolean;
  onTrashToggle: (show: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList) => void;
}> = ({ showTrash, onTrashToggle, searchQuery, onSearchChange, fileInputRef }) => {
  const { state, actions } = useWorkingArea();
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      actions.createFolder(newFolderName);
      toast.success(`Folder "${newFolderName}" created successfully`);
      setNewFolderName('');
      setShowNewFolderInput(false);
    } else {
      toast.error('Folder name cannot be empty');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
      <div className="space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          {state.breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id || 'root'}>
              {/* Home icon for root */}
              {index === 0 && crumb.id === '' && (
                <Home size={18} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
              )}
              
              {/* Separator - ChevronRight before each crumb except first */}
              {index > 0 && (
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              )}
              
              {/* Breadcrumb Button */}
              <button 
                onClick={() => {
                  if (index === 0) {
                    // Go to root
                    actions.goBack();
                  } else if (crumb.id) {
                    // Navigate to folder
                    actions.navigateToFolder(crumb.id);
                  }
                }}
                className={`text-sm transition-colors font-medium whitespace-nowrap max-w-[200px] truncate ${
                  index === state.breadcrumbs.length - 1
                    ? 'text-blue-700 dark:text-blue-300 font-semibold cursor-default'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search size={18} className="text-slate-400 dark:text-slate-600" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => actions.setViewMode(state.view_mode === 'grid' ? 'list' : 'grid')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400"
              title="Toggle view"
            >
              {state.view_mode === 'grid' ? <List size={20} /> : <Grid3X3 size={20} />}
            </button>

            <button
              onClick={() => onTrashToggle(!showTrash)}
              className={`p-2 rounded-md transition ${showTrash ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
              title="Trash"
            >
              <Trash2 size={20} />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!state.current_folder_id}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md transition text-sm sm:text-base ${state.current_folder_id ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
              title={state.current_folder_id ? "Upload" : "Create or select a folder first"}
            >
              <Upload size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {!showNewFolderInput ? (
              <button
                onClick={() => setShowNewFolderInput(true)}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-600 rounded-md transition-all duration-200 font-medium shadow-sm hover:shadow-md text-sm sm:text-base"
                title="New Folder"
              >
                <Plus size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">New Folder</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    } else if (e.key === 'Escape') {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }
                  }}
                  className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }}
                  className="px-4 py-2 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-600 rounded-md text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const GridView: React.FC<{ 
  items: any[]; 
  onSelect: (id: string) => void; 
  selected: Set<string>; 
  onDelete: (type: EntityType, id: string) => void;
  onNavigateFolder: (folderId: string) => void;
  onDownload: (item: any) => void;
  onPreview: (item: any) => void;
  onEdit?: (item: any) => void;
  onRename?: (folderId: string, newName: string) => void;
  isEditable?: (item: any) => boolean;
  searchQuery: string;
}> = ({ items, onSelect, selected, onDelete, onNavigateFolder, onDownload, onPreview, onEdit, onRename, isEditable, searchQuery }) => {
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
      {filteredItems.map(item => (
        <FileGridItem 
          key={item.id} 
          item={item} 
          selected={selected.has(item.id)} 
          onSelect={() => onSelect(item.id)} 
          onDelete={() => onDelete(item.is_folder ? 'folder' : 'file', item.id)}
          onNavigateFolder={onNavigateFolder}
          onDownload={onDownload}
          onPreview={onPreview}
          onEdit={onEdit}
          onRename={onRename}
          isEditable={isEditable}
        />
      ))}
    </div>
  );
};

const ListView: React.FC<{ 
  items: any[]; 
  onSelect: (id: string) => void; 
  selected: Set<string>; 
  onDelete: (type: EntityType, id: string) => void;
  onNavigateFolder: (folderId: string) => void;
  onDownload: (item: any) => void;
  onPreview: (item: any) => void;
  onEdit?: (item: any) => void;
  onRename?: (folderId: string, newName: string) => void;
  isEditable?: (item: any) => boolean;
  searchQuery: string;
}> = ({ items, onSelect, selected, onDelete, onNavigateFolder, onDownload, onPreview, onEdit, onRename, isEditable, searchQuery }) => {
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-2 border border-slate-200/50 dark:border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm bg-white/70 dark:bg-slate-800/70 shadow-lg">
      {filteredItems.map((item, index) => (
        <FileListItem 
          key={item.id} 
          item={item} 
          selected={selected.has(item.id)} 
          onSelect={() => onSelect(item.id)} 
          onDelete={() => onDelete(item.is_folder ? 'folder' : 'file', item.id)} 
          isLast={index === filteredItems.length - 1}
          onNavigateFolder={onNavigateFolder}
          onDownload={onDownload}
          onPreview={onPreview}
          onEdit={onEdit}
          onRename={onRename}
          isEditable={isEditable}
        />
      ))}
    </div>
  );
};

const FileGridItem: React.FC<{ 
  item: any; 
  selected: boolean; 
  onSelect: () => void; 
  onDelete: () => void;
  onNavigateFolder: (folderId: string) => void;
  onDownload: (item: any) => void;
  onPreview: (item: any) => void;
  onEdit?: (item: any) => void;
  onRename?: (folderId: string, newName: string) => void;
  isEditable?: (item: any) => boolean;
}> = ({ item, selected, onSelect, onDelete, onNavigateFolder, onDownload, onPreview, onEdit, onRename, isEditable }) => {
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState(item.name);
  const isFolder = item.is_folder;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFolder) {
      onNavigateFolder(item.id);
    } else {
      onDownload(item);
    }
  };

  // 3D Folder Card Design - Enhanced with new animation
  if (isFolder) {
    return (
      <div 
        className="relative group flex flex-col items-center justify-center cursor-pointer w-full"
        onClick={handleClick}
      >
        <div className="file relative w-full max-w-[160px] sm:max-w-[200px] md:max-w-[240px] h-32 sm:h-40 md:h-44 cursor-pointer origin-bottom [perspective:1500px] z-50">
          {/* Work 5 - Back layer with tab */}
          <div className="work-5 bg-blue-600 dark:bg-blue-700 w-full h-full origin-top rounded-2xl rounded-tl-none group-hover:shadow-[0_20px_40px_rgba(0,0,0,.2)] transition-all ease duration-300 relative after:absolute after:content-[''] after:bottom-[99%] after:left-0 after:w-20 after:h-4 after:bg-blue-600 dark:after:bg-blue-700 after:rounded-t-2xl before:absolute before:content-[''] before:-top-[15px] before:left-[75.5px] before:w-4 before:h-4 before:bg-blue-600 dark:before:bg-blue-700 before:[clip-path:polygon(0_35%,0%_100%,50%_100%)]" />

          {/* Work 4 */}
          <div className="work-4 absolute inset-1 bg-blue-500 dark:bg-blue-600 rounded-2xl transition-all ease duration-300 origin-bottom select-none group-hover:[transform:rotateX(-20deg)]" />

          {/* Work 3 */}
          <div className="work-3 absolute inset-1 bg-blue-400 dark:bg-blue-500 rounded-2xl transition-all ease duration-300 origin-bottom group-hover:[transform:rotateX(-30deg)]" />

          {/* Work 2 */}
          <div className="work-2 absolute inset-1 bg-blue-300 dark:bg-blue-400 rounded-2xl transition-all ease duration-300 origin-bottom group-hover:[transform:rotateX(-38deg)]" />

          {/* Work 1 - Front face with tab */}
          <div className="work-1 absolute bottom-0 bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 w-full h-[156px] rounded-2xl rounded-tr-none after:absolute after:content-[''] after:bottom-[99%] after:right-0 after:w-[146px] after:h-[16px] after:bg-blue-400 dark:after:bg-blue-500 after:rounded-t-2xl before:absolute before:content-[''] before:-top-[10px] before:right-[142px] before:size-3 before:bg-blue-400 dark:before:bg-blue-500 before:[clip-path:polygon(100%_14%,50%_100%,100%_100%)] transition-all ease duration-300 origin-bottom flex items-end group-hover:shadow-[inset_0_20px_40px_#3b82f6,_inset_0_-20px_40px_#1e40af] group-hover:[transform:rotateX(-46deg)_translateY(1px)]">
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <FolderOpen size={32} className="sm:size-[40px] md:size-[48px] text-white opacity-90" />
            </div>
          </div>
        </div>

        {/* Folder name */}
        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-2 sm:mt-3 md:mt-4 text-center truncate w-full px-1 sm:px-2">{item.name}</p>

        {/* Delete and Rename buttons */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 opacity-0 group-hover:opacity-100 p-1.5 sm:p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg z-50"
        >
          <X size={14} className="sm:size-4" />
        </button>

        {/* Rename button */}
        {onRename && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRenameModal(true);
            }}
            className="absolute -top-1 -right-10 sm:-top-2 sm:-right-12 opacity-0 group-hover:opacity-100 p-1.5 sm:p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-lg z-50"
          >
            <Edit3 size={14} className="sm:size-4" />
          </button>
        )}

        {/* Rename Modal */}
        {onRename && (
          <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Folder</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Enter new folder name"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameValue.trim()) {
                      onRename(item.id, renameValue.trim());
                      setShowRenameModal(false);
                      setRenameValue(item.name);
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <button
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenameValue(item.name);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (renameValue.trim()) {
                      onRename(item.id, renameValue.trim());
                      setShowRenameModal(false);
                      setRenameValue(item.name);
                    }
                  }}
                  disabled={!renameValue.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Rename
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Regular file card (redesigned with themed icons and hover actions)
  const fileConfig = getFileTypeConfig(item.name, item.file_type);
  const IconComponent = fileConfig.icon;
  const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      className={`group relative border rounded-lg sm:rounded-xl transition-all duration-300 overflow-hidden cursor-pointer w-full ${
        selected 
          ? `${fileConfig.borderColor} ${fileConfig.bgColor} shadow-md scale-[1.02] sm:scale-105` 
          : `border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 sm:hover:-translate-y-1 hover:scale-[1.01] sm:hover:scale-[1.02]`
      }`} 
      onClick={handleClick}
    >
      {/* Icon Section - Top */}
      <div className={`w-full h-24 sm:h-32 ${fileConfig.bgColor} dark:${fileConfig.bgColor}/30 flex items-center justify-center border-b ${fileConfig.borderColor} transition-transform duration-300 group-hover:scale-105 sm:group-hover:scale-110`}>
        <IconComponent size={36} className={`sm:w-12 sm:h-12 ${fileConfig.primaryColor}`} />
      </div>

      {/* Info Section */}
      <div className="p-3 sm:p-4 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50">
        <h3 className="font-bold text-xs sm:text-sm truncate text-slate-900 dark:text-white mb-1.5 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {item.name}
        </h3>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-semibold ${fileConfig.primaryColor} px-2 py-0.5 rounded-md ${fileConfig.bgColor} dark:${fileConfig.bgColor}/30`}>
            {fileConfig.label}
          </p>
        </div>
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
          {`${((item as any).size_bytes / 1024 / 1024).toFixed(2)} MB • ${formattedDate}`}
        </p>
      </div>

      {/* Hover Action Buttons */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-2 sm:p-3 flex gap-1.5 sm:gap-2 justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-full group-hover:translate-y-0">
        {isPreviewable(item.name, item.file_type) && (() => {
          // Map text color to background color for preview button
          const getPreviewBgColor = (primaryColor: string) => {
            if (primaryColor === 'text-blue-600') return 'bg-blue-600 hover:bg-blue-700';
            if (primaryColor === 'text-emerald-600') return 'bg-emerald-600 hover:bg-emerald-700';
            if (primaryColor === 'text-orange-600') return 'bg-orange-600 hover:bg-orange-700';
            if (primaryColor === 'text-red-600') return 'bg-red-600 hover:bg-red-700';
            if (primaryColor === 'text-purple-600') return 'bg-purple-600 hover:bg-purple-700';
            if (primaryColor === 'text-indigo-600') return 'bg-indigo-600 hover:bg-indigo-700';
            if (primaryColor === 'text-slate-600') return 'bg-slate-600 hover:bg-slate-700';
            return 'bg-blue-600 hover:bg-blue-700';
          };
          
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item);
              }}
              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-white text-[10px] sm:text-xs font-medium transition-all duration-200 ${getPreviewBgColor(fileConfig.primaryColor)} hover:shadow-md transform hover:scale-105 active:scale-95`}
            >
              <Eye size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          );
        })()}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(item);
          }}
          className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 border ${fileConfig.borderColor} ${fileConfig.primaryColor} hover:${fileConfig.bgColor} hover:shadow-md transform hover:scale-105 active:scale-95`}
        >
          <DownloadIcon size={12} className="sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>

      {/* Delete Button - Top Right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const FileListItem: React.FC<{ 
  item: any; 
  selected: boolean; 
  onSelect: () => void; 
  onDelete: () => void; 
  isLast: boolean;
  onNavigateFolder: (folderId: string) => void;
  onDownload: (item: any) => void;
  onPreview: (item: any) => void;
  onEdit?: (item: any) => void;
  onRename?: (folderId: string, newName: string) => void;
  isEditable?: (item: any) => boolean;
}> = ({ item, selected, onSelect, onDelete, isLast, onNavigateFolder, onDownload, onPreview, onEdit, onRename, isEditable }) => {
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState(item.name);
  const isFolder = item.is_folder;
  const fileConfig = !isFolder ? getFileTypeConfig(item.name, item.file_type) : null;
  const IconComponent = fileConfig?.icon;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect();
  };

  const handleRowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isFolder) {
      onNavigateFolder(item.id);
    } else {
      onDownload(item);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: new Date().getFullYear() !== new Date(item.created_at).getFullYear() ? 'numeric' : undefined
  });

  return (
    <div 
      className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 h-auto sm:h-16 transition-all duration-200 cursor-pointer group border-b border-slate-200/50 dark:border-slate-700/50 ${
        selected 
          ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/20 border-l-4 border-l-blue-500 dark:border-l-blue-400' 
          : 'hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50/30 dark:hover:from-slate-800/50 dark:hover:to-blue-900/10'
      } ${isLast ? 'border-b-0' : ''}`}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={handleCheckboxChange}
        className="w-4 h-4 sm:w-5 sm:h-5 rounded accent-blue-600 dark:accent-blue-500 flex-shrink-0 transition-all duration-200 group-hover:scale-110 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Icon - Enhanced */}
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:shadow-md ${
        isFolder 
          ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/30' 
          : fileConfig?.bgColor || 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/50 dark:to-slate-600/30'
      }`}>
        {isFolder ? (
          <FolderOpen size={20} className="text-blue-600 dark:text-blue-400" />
        ) : IconComponent ? (
          <IconComponent size={20} className={fileConfig?.primaryColor} />
        ) : (
          <FileIcon size={20} className="text-slate-600 dark:text-slate-400" />
        )}
      </div>
      
      {/* File Name - Flex */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate transition-colors duration-200">
          {item.name}
        </div>
        {/* Mobile: Show type and size below name */}
        <div className="flex items-center gap-2 mt-0.5 sm:hidden">
          <span className={`text-xs font-medium ${isFolder ? 'text-blue-600 dark:text-blue-400' : fileConfig?.primaryColor || 'text-slate-500'}`}>
            {isFolder ? 'Folder' : fileConfig?.label || 'File'}
          </span>
          {!isFolder && (
            <>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatFileSize(item.size_bytes)}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* File Type Label - Desktop only */}
      <div className="text-xs font-semibold flex-shrink-0 hidden md:block min-w-fit px-2 py-1 rounded-md transition-colors duration-200 bg-slate-100/50 dark:bg-slate-800/50">
        {isFolder ? (
          <span className="text-blue-600 dark:text-blue-400">Folder</span>
        ) : (
          <span className={fileConfig?.primaryColor || 'text-slate-600 dark:text-slate-400'}>
            {fileConfig?.label || 'File'}
          </span>
        )}
      </div>
      
      {/* File Size - Desktop only */}
      <div className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 hidden md:block min-w-fit w-20 text-right font-medium">
        {isFolder ? '—' : formatFileSize(item.size_bytes)}
      </div>
      
      {/* Date - Desktop only */}
      <div className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 hidden lg:block min-w-fit w-24">
        {formattedDate}
      </div>
      
      {/* Action Buttons - Enhanced */}
      <div className="flex gap-1 sm:gap-1.5 flex-shrink-0 opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
        {!isFolder && isEditable && isEditable(item) && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white hover:shadow-md"
            title="Edit file"
          >
            <Edit2 size={16} className="sm:w-4 sm:h-4" />
          </button>
        )}
        {!isFolder && isPreviewable(item.name, item.file_type) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(item);
            }}
            className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 text-white hover:shadow-md ${
              fileConfig?.primaryColor === 'text-blue-600' ? 'bg-blue-600 hover:bg-blue-700' :
              fileConfig?.primaryColor === 'text-emerald-600' ? 'bg-emerald-600 hover:bg-emerald-700' :
              fileConfig?.primaryColor === 'text-orange-600' ? 'bg-orange-600 hover:bg-orange-700' :
              fileConfig?.primaryColor === 'text-red-600' ? 'bg-red-600 hover:bg-red-700' :
              fileConfig?.primaryColor === 'text-purple-600' ? 'bg-purple-600 hover:bg-purple-700' :
              fileConfig?.primaryColor === 'text-indigo-600' ? 'bg-indigo-600 hover:bg-indigo-700' :
              fileConfig?.primaryColor === 'text-slate-600' ? 'bg-slate-600 hover:bg-slate-700' :
              'bg-slate-600 hover:bg-slate-700'
            }`}
            title="Preview"
          >
            <Eye size={16} className="sm:w-4 sm:h-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isFolder) {
              onNavigateFolder(item.id);
            } else {
              onDownload(item);
            }
          }}
          className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 ${
            isFolder 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40' 
              : `${fileConfig?.bgColor || 'bg-slate-100 dark:bg-slate-700'} ${fileConfig?.primaryColor || 'text-slate-600 dark:text-slate-400'}`
          } hover:shadow-md`}
          title={isFolder ? 'Open folder' : 'Download'}
        >
          {isFolder ? <FolderOpen size={16} className="sm:w-4 sm:h-4" /> : <DownloadIcon size={16} className="sm:w-4 sm:h-4" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 sm:p-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 hover:shadow-md"
          title="Delete"
        >
          <Trash2 size={16} className="sm:w-4 sm:h-4" />
        </button>
        {isFolder && onRename && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRenameModal(true);
            }}
            className="p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 hover:shadow-md"
            title="Rename"
          >
            <Edit3 size={16} className="sm:w-4 sm:h-4" />
          </button>
        )}
      </div>

      {/* Rename Modal */}
      {isFolder && onRename && (
        <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new folder name"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameValue.trim()) {
                    onRename(item.id, renameValue.trim());
                    setShowRenameModal(false);
                    setRenameValue(item.name);
                  }
                }}
              />
            </div>
            <DialogFooter>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameValue(item.name);
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) {
                    onRename(item.id, renameValue.trim());
                    setShowRenameModal(false);
                    setRenameValue(item.name);
                  }
                }}
                disabled={!renameValue.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Rename
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="text-center">
      <div className="inline-flex animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 border-4 border-blue-200 dark:border-blue-900/30 border-t-blue-600 dark:border-t-blue-400 mb-4 sm:mb-6" />
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">Loading your files...</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ createFolder: (name: string) => void; isFolderView?: boolean }> = ({ createFolder, isFolderView }) => {
  if (!isFolderView) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] sm:min-h-[500px] px-4">
        <div className="text-center max-w-md">
          {/* Icon Container */}
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/10 rounded-full">
            <FolderOpen size={64} className="sm:w-24 sm:h-24 text-blue-500 dark:text-blue-400" />
          </div>
          
          {/* Heading */}
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3">No folders yet</h3>
          
          {/* Subheading */}
          <p className="text-sm sm:text-base text-slate-600 dark:text-white max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed">
            Create your first folder to start organizing your files. It's quick and easy!
          </p>
          
          {/* CTA Button */}
          <button
            onClick={() => {
              const name = prompt('Enter folder name:');
              if (name && name.trim()) {
                createFolder(name.trim());
              } else if (name !== null) {
                toast.error('Folder name cannot be empty');
              }
            }}
            className="inline-flex items-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-xl hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all duration-300 touch-manipulation text-sm sm:text-base"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            Create Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[400px] sm:min-h-[500px] px-4">
      <div className="text-center max-w-md">
        {/* Icon Container */}
        <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-full">
          <Upload size={40} className="sm:w-12 sm:h-12 text-slate-500 dark:text-slate-400" />
        </div>
        
        {/* Heading */}
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3">This folder is empty</h3>
        
        {/* Subheading */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Upload files to get started. You can organize them into subfolders anytime.
        </p>
      </div>
    </div>
  );
};

export default WorkingAreaPage;
