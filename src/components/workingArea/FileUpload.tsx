import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useWorkingArea } from '../../pages/WorkingArea';
import {
  UploadStatus,
} from '@/types/workingArea';

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  uploadedBytes: number;
}

interface FileUploadProps {
  currentFolderId: string;
  onUploadComplete?: (fileIds: string[]) => void;
  maxFileSize?: number; // bytes, default 100MB
  allowedFileTypes?: string[];
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const BLOCKED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.pif',
  '.scr',
  '.vbs',
  '.js',
  '.jar',
  '.zip',
  '.rar',
  '.7z',
];

export const FileUpload: React.FC<FileUploadProps> = ({
  currentFolderId,
  onUploadComplete,
  maxFileSize = 104857600, // 100MB
  allowedFileTypes = [],
  showNotification,
}) => {
  const { actions } = useWorkingArea();
  const [uploads, setUploads] = useState<FileUploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Validate file before upload
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxFileSize / 1024 / 1024}MB limit`,
      };
    }

    // Check blocked extensions
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `File type ${extension} is not allowed for security reasons`,
      };
    }

    // Check allowed types if specified
    if (allowedFileTypes.length > 0) {
      const fileType = file.type;
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();

      const isAllowed =
        allowedFileTypes.some((type) => fileType.includes(type)) ||
        allowedFileTypes.includes(extension);

      if (!isAllowed) {
        return {
          valid: false,
          error: `File type not allowed. Allowed: ${allowedFileTypes.join(', ')}`,
        };
      }
    }

    return { valid: true };
  };

  // Handle file selection from input
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files) {
        handleFiles(Array.from(files));
      }
    },
    []
  );

  // Handle files (from input or drag-drop)
  const handleFiles = useCallback(
    async (files: File[]) => {
      const newUploads: FileUploadItem[] = [];
      const uploadIds: string[] = [];

      // Process each file
      for (const file of files) {
        const validation = validateFile(file);

        if (!validation.valid) {
          showNotification?.(validation.error || 'File validation failed', 'error');
          continue;
        }

        const uploadId = Math.random().toString(36).substring(7);
        uploadIds.push(uploadId);

        const uploadItem: FileUploadItem = {
          id: uploadId,
          file,
          progress: 0,
          status: 'pending',
          uploadedBytes: 0,
        };

        newUploads.push(uploadItem);
        setUploads((prev) => [...prev, uploadItem]);
      }

      // Start uploads
      for (const upload of newUploads) {
        await uploadFile(upload);
      }
    },
    [maxFileSize, allowedFileTypes, showNotification]
  );

  // Upload a single file
  const uploadFile = async (upload: FileUploadItem) => {
    try {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id ? { ...u, status: 'uploading' as UploadStatus } : u
        )
      );

      // uploadRequest no longer needed - using context directly

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploads((prev) =>
          prev.map((u) => {
            if (u.id === upload.id && u.progress < 90) {
              return { ...u, progress: u.progress + Math.random() * 20 };
            }
            return u;
          })
        );
      }, 500);

      // Use the parent's upload action from WorkingAreaContext
      await actions.uploadFiles([upload.file]);

      clearInterval(progressInterval);

      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                progress: 100,
                status: 'uploading' as UploadStatus,
              }
            : u
        )
      );

      showNotification?.(`${upload.file.name} uploaded successfully`, 'success');

      // Trigger parent callback
      if (onUploadComplete) {
        onUploadComplete([upload.id]);
      }

      // Refresh folder contents
      await actions.navigateToFolder(currentFolderId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: 'error' as UploadStatus,
                error: errorMessage,
              }
            : u
        )
      );

      showNotification?.(
        `Failed to upload ${upload.file.name}: ${errorMessage}`,
        'error'
      );
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Remove upload from list
  const removeUpload = (uploadId: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  // Retry failed upload
  const retryUpload = (uploadId: string) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (upload) {
      uploadFile(upload);
    }
  };

  // Clear completed uploads
  const clearCompleted = () => {
    setUploads((prev) =>
      prev.filter((u) => u.status !== 'uploading' && u.status !== 'error')
    );
  };

  const activeUploads = uploads.filter((u) => u.status === 'uploading' || u.status === 'pending');
  const completedUploads = uploads.filter((u) => u.status === 'uploading');
  const failedUploads = uploads.filter((u) => u.status === 'error');

  return (
    <div className="flex flex-col gap-4">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={allowedFileTypes.length > 0 ? allowedFileTypes.join(',') : undefined}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              Drag and drop files here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max file size: {maxFileSize / 1024 / 1024}MB
            </p>
          </div>
        </div>
      </div>

      {/* Active Uploads */}
      {activeUploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Uploading</h3>
          {activeUploads.map((upload) => (
            <div key={upload.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {upload.file.name}
                  </p>
                  <p className="text-xs text-gray-500 ml-2">
                    {Math.round(upload.progress)}%
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(upload.progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(upload.file.size / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>
              <Loader className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Completed Uploads */}
      {completedUploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Completed</h3>
            <button
              onClick={clearCompleted}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          {completedUploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center justify-between gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-900 truncate">
                  {upload.file.name}
                </p>
              </div>
              <button
                onClick={() => removeUpload(upload.id)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Failed Uploads */}
      {failedUploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Failed</h3>
          {failedUploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center justify-between gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {upload.file.name}
                  </p>
                  {upload.error && (
                    <p className="text-xs text-red-600 mt-0.5">{upload.error}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => retryUpload(upload.id)}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                >
                  Retry
                </button>
                <button
                  onClick={() => removeUpload(upload.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Summary */}
      {uploads.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {uploads.filter((u) => u.status === 'success').length} of{' '}
              {uploads.length} files uploaded
            </span>
            {uploads.some((u) => u.status === 'error') && (
              <span className="text-red-600">
                {uploads.filter((u) => u.status === 'error').length} failed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
