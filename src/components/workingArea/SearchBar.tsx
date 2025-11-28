import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X, Calendar, FileType, ChevronDown, Loader } from 'lucide-react';
import { WorkingAreaFile, WorkingAreaFolder } from '@/types/workingArea';

interface SearchBarProps {
  onSearch: (results: (WorkingAreaFile | WorkingAreaFolder)[]) => void;
  onClose?: () => void;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface SearchFilters {
  fileType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minSize?: number;
  maxSize?: number;
}

const FILE_TYPES = [
  { value: 'document', label: 'Documents', extensions: ['.pdf', '.doc', '.docx', '.txt'] },
  { value: 'image', label: 'Images', extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
  { value: 'video', label: 'Videos', extensions: ['.mp4', '.webm', '.mov', '.avi'] },
  { value: 'audio', label: 'Audio', extensions: ['.mp3', '.wav', '.ogg', '.m4a'] },
  { value: 'spreadsheet', label: 'Spreadsheets', extensions: ['.xls', '.xlsx', '.csv'] },
  { value: 'archive', label: 'Archives', extensions: ['.zip', '.rar', '.7z'] },
  { value: 'code', label: 'Code', extensions: ['.js', '.ts', '.py', '.java', '.css'] },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClose,
  showNotification,
}) => {
  const [query, setQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update suggestions as user types
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      // Set new timeout for search
      searchTimeoutRef.current = setTimeout(() => {
        // In a real implementation, this would call an API endpoint to get suggestions
        // For now, we'll simulate with some example suggestions
        const mockSuggestions = [
          `${value} documents`,
          `${value} images`,
          `${value} recent`,
        ];
        setSuggestions(mockSuggestions);
        setShowSuggestions(true);
      }, 300);
    },
    []
  );

  // Perform search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      showNotification?.('Please enter a search query', 'info');
      return;
    }

    try {
      setIsSearching(true);

      // TODO: Implement when working_area_files table is deployed to Supabase
      const results: (WorkingAreaFile | WorkingAreaFolder)[] = [];

      onSearch(results);
      setShowSuggestions(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      showNotification?.(message, 'error');
    } finally {
      setIsSearching(false);
    }
  }, [query, filters, onSearch, showNotification]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Update filter
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Main Search Input */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              disabled={isSearching}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />

            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Advanced search"
          >
            <ChevronDown
              className={`w-5 h-5 text-gray-600 transition transform ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
          </button>

          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 transition"
          >
            {isSearching ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
              title="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(suggestion);
                  setShowSuggestions(false);
                  handleQueryChange(suggestion);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* File Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <FileType className="w-4 h-4 inline mr-2" />
                File Type
              </label>
              <select
                value={filters.fileType || ''}
                onChange={(e) => updateFilter('fileType', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All types</option>
                {FILE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                File Size
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={filters.minSize || ''}
                  onChange={(e) =>
                    updateFilter('minSize', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Min</option>
                  <option value="0">0MB</option>
                  <option value="1048576">1MB</option>
                  <option value="10485760">10MB</option>
                </select>
                <span className="text-gray-500">-</span>
                <select
                  value={filters.maxSize || ''}
                  onChange={(e) =>
                    updateFilter('maxSize', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Max</option>
                  <option value="1048576">1MB</option>
                  <option value="10485760">10MB</option>
                  <option value="104857600">100MB</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  updateFilter('dateFrom', e.target.value ? new Date(e.target.value) : undefined)
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  updateFilter('dateTo', e.target.value ? new Date(e.target.value) : undefined)
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {Object.keys(filters).length > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {Object.keys(filters).length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex flex-wrap gap-2">
          {filters.fileType && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">
              Type: {FILE_TYPES.find((t) => t.value === filters.fileType)?.label}
              <button
                onClick={() => updateFilter('fileType', undefined)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.minSize && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">
              Min: {(filters.minSize / 1048576).toFixed(1)}MB
              <button
                onClick={() => updateFilter('minSize', undefined)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.maxSize && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">
              Max: {(filters.maxSize / 1048576).toFixed(1)}MB
              <button
                onClick={() => updateFilter('maxSize', undefined)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
