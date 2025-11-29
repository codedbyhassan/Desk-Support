import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, Trash, Loader, AlertCircle, Calendar, File, Folder } from 'lucide-react';
import { WorkingAreaTrash } from '@/types/workingArea';
import { supabase } from '@/lib/supabase';

interface TrashViewProps {
  onClose?: () => void;
  onRestore?: (itemId: string) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface TrashItemDisplay extends WorkingAreaTrash {
  autoDeletesIn: string;
  daysRemaining: number;
}

export const TrashView: React.FC<TrashViewProps> = ({
  onClose,
  onRestore,
  onDelete,
  showNotification,
}) => {
  const [items, setItems] = useState<TrashItemDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadTrashItems();
    // Refresh countdown every minute
    const interval = setInterval(loadTrashItems, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load trash items
  const loadTrashItems = async () => {
    try {
      setIsLoading(true);
      
      // Get current user for filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Fetch deleted items for current user
      const { data: trashItems, error } = await supabase
        .from('working_area_trash')
        .select('*')
        .eq('owner_id', user.id)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate days remaining and format for display
      const now = new Date();
      const TRASH_RETENTION_DAYS = 30;
      
      const itemsWithCountdown: TrashItemDisplay[] = (trashItems || []).map(item => {
        const deletedDate = new Date(item.deleted_at);
        const expiryDate = new Date(deletedDate.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        return {
          ...item,
          daysRemaining: Math.max(0, daysRemaining),
          autoDeletesIn: daysRemaining > 0 
            ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
            : 'Today'
        };
      });
      
      setItems(itemsWithCountdown);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load trash';
      showNotification?.(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore single item
  const handleRestore = async (itemId: string) => {
    try {
      setIsRestoring(true);
      
      // Find item to determine its type
      const item = items.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');
      
      // Restore by setting deleted_at to NULL
      const tableName = item.item_type === 'folder' 
        ? 'working_area_folders' 
        : 'working_area_files';
      
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: null })
        .eq('id', item.original_item_id);
      
      if (error) throw error;
      
      showNotification?.('Item restored successfully', 'success');
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (selectedItems.includes(itemId)) {
        setSelectedItems((prev) => prev.filter((id) => id !== itemId));
      }
      onRestore?.(itemId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore item';
      showNotification?.(message, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete item permanently
  const handleDelete = async (itemId: string) => {
    try {
      setIsDeleting(true);
      
      // Find item to determine its type
      const item = items.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');
      
      // Permanently delete from trash
      const { error } = await supabase
        .from('working_area_trash')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      showNotification?.('Item deleted permanently', 'success');
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (selectedItems.includes(itemId)) {
        setSelectedItems((prev) => prev.filter((id) => id !== itemId));
      }
      onDelete?.(itemId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete item';
      showNotification?.(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore selected items
  const handleRestoreSelected = async () => {
    try {
      setIsRestoring(true);
      
      // Get all items to restore
      const itemsToRestore = items.filter(item => selectedItems.includes(item.id));
      
      // Group by type for batch operations
      const folders = itemsToRestore.filter(i => i.item_type === 'folder');
      const files = itemsToRestore.filter(i => i.item_type === 'file');
      
      // Batch restore folders
      if (folders.length > 0) {
        const folderIds = folders.map(f => f.original_item_id);
        const { error } = await supabase
          .from('working_area_folders')
          .update({ deleted_at: null })
          .in('id', folderIds);
        
        if (error) throw error;
      }
      
      // Batch restore files
      if (files.length > 0) {
        const fileIds = files.map(f => f.original_item_id);
        const { error } = await supabase
          .from('working_area_files')
          .update({ deleted_at: null })
          .in('id', fileIds);
        
        if (error) throw error;
      }
      
      showNotification?.(
        `${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} restored`,
        'success'
      );
      setItems((prev) => prev.filter((item) => !selectedItems.includes(item.id)));
      setSelectedItems([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore items';
      showNotification?.(message, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete selected items permanently
  const handleDeleteSelected = async () => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      // Batch delete from trash permanently
      const { error } = await supabase
        .from('working_area_trash')
        .delete()
        .in('id', selectedItems);
      
      if (error) throw error;
      
      showNotification?.(
        `${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} deleted`,
        'success'
      );
      setItems((prev) => prev.filter((item) => !selectedItems.includes(item.id)));
      setSelectedItems([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete items';
      showNotification?.(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle item selection
  const toggleSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.id));
    }
  };

  // Get item name
  const getItemName = (item: TrashItemDisplay): string => {
    if (item.metadata?.name) {
      return item.metadata.name;
    }
    return `${item.entity_type} (restored)`;
  };

  // Format date
  const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get warning color based on days remaining
  const getWarningColor = (daysRemaining: number): string => {
    if (daysRemaining <= 3) return 'bg-red-50';
    if (daysRemaining <= 7) return 'bg-yellow-50';
    return 'bg-gray-50';
  };

  const getBadgeColor = (daysRemaining: number): string => {
    if (daysRemaining <= 3) return 'bg-red-100 text-red-800';
    if (daysRemaining <= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Trash
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Items are automatically deleted after 30 days
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ✕
          </button>
        )}
      </div>

      {items.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Trash2 className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Trash is empty</h3>
          <p className="text-sm text-gray-500 text-center">
            Deleted files and folders will appear here for 30 days
          </p>
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.length} selected
              </span>
              <div className="flex-1" />
              <button
                onClick={handleRestoreSelected}
                disabled={isRestoring}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {isRestoring ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Restore
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400 transition"
              >
                {isDeleting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          )}

          {/* Select All */}
          <div className="flex items-center p-2 bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={selectedItems.length === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-600 ml-2">
              Select all ({items.length} items)
            </span>
          </div>

          {/* Warning for items expiring soon */}
          {items.some((item) => item.daysRemaining <= 3) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  {items.filter((item) => item.daysRemaining <= 3).length} item(s) will be
                  permanently deleted soon
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Restore them now if you want to keep them
                </p>
              </div>
            </div>
          )}

          {/* Trash Items */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition ${getWarningColor(item.daysRemaining)} ${
                  selectedItems.includes(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    className="w-4 h-4 rounded mt-1"
                  />

                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {item.entity_type === 'file' ? (
                      <File className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Folder className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getItemName(item)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          Deleted: {formatDate(item.deleted_at)}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${getBadgeColor(
                            item.daysRemaining
                          )}`}
                        >
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {item.daysRemaining} days left
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRestore(item.id)}
                      disabled={isRestoring}
                      className="p-1.5 hover:bg-gray-200 rounded transition disabled:opacity-50"
                      title="Restore"
                    >
                      {isRestoring ? (
                        <Loader className="w-4 h-4 animate-spin text-gray-600" />
                      ) : (
                        <RotateCcw className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting}
                      className="p-1.5 hover:bg-red-100 rounded transition disabled:opacity-50"
                      title="Delete permanently"
                    >
                      {isDeleting ? (
                        <Loader className="w-4 h-4 animate-spin text-gray-600" />
                      ) : (
                        <Trash className="w-4 h-4 text-red-600 hover:text-red-900" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TrashView;
