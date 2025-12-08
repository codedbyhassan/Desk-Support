import React, { useEffect, useState } from 'react';
import { X, Search, Loader, Check, Trash2, Calendar } from 'lucide-react';
import { AccessLevel, ShareType, UserInfo, TeamInfo } from '@/types/workingArea';
import { supabase } from '@/lib/supabase';
import { colors, components, sizing, typography, patterns } from '@/lib/theme';

interface ShareDialogProps {
  isOpen: boolean;
  folderId: string;
  folderName: string;
  currentShareType: ShareType;
  onClose: () => void;
  onShare: (accessLevel: AccessLevel, expiresAt?: Date) => Promise<void>;
  onRevoke: (accessId: string) => Promise<void>;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface AccessItem {
  id: string;
  type: 'user' | 'team';
  name: string;
  email?: string;
  permissionLevel: AccessLevel;
  grantedBy: string;
  expiresAt?: Date;
  createdAt: Date;
}

const PERMISSION_LEVELS: { value: AccessLevel; label: string; description: string }[] = [
  {
    value: 'view',
    label: 'View',
    description: 'Can view files only',
  },
  {
    value: 'download',
    label: 'Download',
    description: 'Can view and download files',
  },
  {
    value: 'upload',
    label: 'Upload',
    description: 'Can view, download, and upload files',
  },
  {
    value: 'edit',
    label: 'Edit',
    description: 'Can view, download, upload, and edit files',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access including sharing permissions',
  },
];

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  folderId,
  folderName,
  currentShareType,
  onClose,
  onShare,
  onRevoke,
  showNotification,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserInfo[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<TeamInfo[]>([]);
  const [searchResults, setSearchResults] = useState<(UserInfo | TeamInfo)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentAccess, setCurrentAccess] = useState<AccessItem[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<AccessLevel>('view');
  const [expirationDays, setExpirationDays] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shareType, setShareType] = useState<ShareType>(currentShareType);

  useEffect(() => {
    if (isOpen) {
      loadCurrentAccess();
    }
  }, [isOpen, folderId]);

  // Load current access for the folder
  const loadCurrentAccess = async () => {
    try {
      setIsLoading(true);
      
      // Fetch current access grants for this folder
      const { data: access, error } = await supabase
        .from('working_area_access')
        .select('*')
        .eq('folder_id', folderId);
      
      if (error) throw error;
      
      // Transform access records to AccessItem format
      const accessItems: AccessItem[] = (access || []).map(a => ({
        id: a.id,
        type: a.user_id ? 'user' : 'team',
        name: a.user_id ? a.user_id : a.team_id || 'Unknown',
        email: a.user_id ? a.user_id : undefined,
        permissionLevel: a.access_level as AccessLevel,
        grantedBy: a.granted_by || 'System',
        expiresAt: a.expires_at ? new Date(a.expires_at) : undefined,
        createdAt: new Date(a.created_at)
      }));
      
      setCurrentAccess(accessItems);
    } catch (error) {
      console.error('Failed to load access:', error);
      showNotification?.('Failed to load sharing information', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Search for users and teams
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // In a real implementation, this would call an API endpoint to search users and teams
      // For now, we'll simulate with empty results
      const results: (UserInfo | TeamInfo)[] = [];
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      showNotification?.('Search failed', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (user: UserInfo) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  // Toggle team selection
  const toggleTeamSelection = (team: TeamInfo) => {
    setSelectedTeams((prev) =>
      prev.find((t) => t.id === team.id)
        ? prev.filter((t) => t.id !== team.id)
        : [...prev, team]
    );
  };

  // Share with selected users and teams
  const handleShare = async () => {
    try {
      setIsLoading(true);

      const expiresAt = expirationDays
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
        : undefined;

      // Share with users
      for (const _ of selectedUsers) {
        await onShare(selectedPermission, expiresAt);
      }

      // Share with teams
      for (const _ of selectedTeams) {
        await onShare(selectedPermission, expiresAt);
      }

      showNotification?.('Sharing updated successfully', 'success');
      setSelectedUsers([]);
      setSelectedTeams([]);
      setSearchQuery('');
      setExpirationDays(null);

      // Reload access
      await loadCurrentAccess();
    } catch (error) {
      console.error('Share failed:', error);
      showNotification?.('Failed to update sharing', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke access
  const handleRevokeAccess = async (accessId: string) => {
    try {
      setIsLoading(true);
      await onRevoke(accessId);
      showNotification?.('Access revoked', 'success');
      await loadCurrentAccess();
    } catch (error) {
      console.error('Revoke failed:', error);
      showNotification?.('Failed to revoke access', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Share "{folderName}"</h2>
            <p className="text-sm text-gray-500 mt-1">Manage who can access this folder</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Share Type Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Share Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {['private', 'company', 'team', 'specific_users'].map((type) => (
                <button
                  key={type}
                  onClick={() => setShareType(type as ShareType)}
                  disabled={isLoading}
                  className={`p-3 rounded-lg border text-left transition ${
                    shareType === type
                      ? `border-[${colors.primary.main}] bg-[${colors.primary.light}]`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {type === 'private' && 'Only you'}
                    {type === 'company' && 'Everyone in company'}
                    {type === 'team' && 'Team members'}
                    {type === 'specific_users' && 'Selected users'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Search and Add Users/Teams */}
          {shareType === 'specific_users' && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Add Users and Teams</h3>

              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users or teams..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <Loader className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className={`${colors.neutral.light} rounded-lg p-3 max-h-48 overflow-y-auto space-y-2`}>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        if ('email' in result) {
                          toggleUserSelection(result as UserInfo);
                        } else {
                          toggleTeamSelection(result as TeamInfo);
                        }
                      }}
                      disabled={isLoading}
                      className={`w-full flex items-center gap-3 p-2 hover:${colors.neutral.light} rounded text-left ${patterns.smoothTransition}`}
                    >
                      <input
                        type="checkbox"
                        checked={
                          'email' in result
                            ? selectedUsers.some((u) => u.id === result.id)
                            : selectedTeams.some((t) => t.id === result.id)
                        }
                        onChange={() => {}}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {('full_name' in result ? (result as UserInfo).full_name : (result as TeamInfo).name) || 
                           ('email' in result ? (result as UserInfo).email : 'Unknown')}
                        </p>
                        {'email' in result && (
                          <p className="text-xs text-gray-500">{(result as UserInfo).email}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Items */}
              {(selectedUsers.length > 0 || selectedTeams.length > 0) && (
                <div className="mt-3 space-y-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                    >
                      <p className="text-sm text-gray-900">{(user as UserInfo).full_name || (user as UserInfo).email}</p>
                      <button
                        onClick={() => toggleUserSelection(user)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {selectedTeams.map((team) => (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between p-2 bg-[${colors.primary.light}] rounded border border-[${colors.primary.border}]`}
                    >
                      <p className="text-sm text-gray-900">{team.name}</p>
                      <button
                        onClick={() => toggleTeamSelection(team)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Permission Level Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Permission Level</h3>
            <div className="space-y-2">
              {PERMISSION_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSelectedPermission(level.value)}
                  disabled={isLoading}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                    selectedPermission === level.value
                      ? `border-[${colors.primary.main}] bg-[${colors.primary.light}]`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    checked={selectedPermission === level.value}
                    onChange={() => {}}
                    className="w-4 h-4 mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{level.label}</p>
                    <p className="text-xs text-gray-500">{level.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Expiration */}
          {shareType === 'specific_users' && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Access Expiration</h3>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={expirationDays || ''}
                  onChange={(e) => setExpirationDays(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No expiration</option>
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            </div>
          )}

          {/* Current Access */}
          {currentAccess.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Current Access</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentAccess.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{access.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 bg-[${colors.primary.lighter}] text-[${colors.primary.text}] rounded`}>
                          {access.permissionLevel}
                        </span>
                        {access.expiresAt && (
                          <span className="text-xs text-gray-500">
                            Expires: {access.expiresAt.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(access.id)}
                      disabled={isLoading}
                      className="text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:text-gray-400"
            >
              Cancel
            </button>
            {shareType === 'specific_users' && (selectedUsers.length > 0 || selectedTeams.length > 0) && (
              <button
                onClick={handleShare}
                disabled={isLoading}
                className={`px-4 py-2 bg-[${colors.primary.main}] text-white rounded-lg hover:bg-[${colors.primary.dark}] disabled:bg-[${colors.primary.lighter}] flex items-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Share
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
