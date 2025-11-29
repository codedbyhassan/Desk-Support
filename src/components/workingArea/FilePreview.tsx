import React, { useEffect, useState } from 'react';
import { X, Download, Share2, ChevronLeft, ChevronRight, Loader, AlertCircle } from 'lucide-react';
import { WorkingAreaFile } from '@/types/workingArea';
import { supabase } from '@/lib/supabase';

interface FilePreviewProps {
  isOpen: boolean;
  file?: WorkingAreaFile;
  allFiles?: WorkingAreaFile[]; // For navigation between files
  onClose: () => void;
  onShare?: () => void;
  onDownload?: (fileId: string) => Promise<void>;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];

const SUPPORTED_TEXT_TYPES = [
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  'text/markdown',
];

export const FilePreview: React.FC<FilePreviewProps> = ({
  isOpen,
  file,
  allFiles = [],
  onClose,
  onShare,
  onDownload,
  showNotification,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<WorkingAreaFile | undefined>(file);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      setCurrentFile(file);
      loadPreview(file);
    }
  }, [isOpen, file]);

  // Load preview for the current file
  const loadPreview = async (previewFile: WorkingAreaFile) => {
    try {
      setIsLoading(true);
      setError('');

      // Check if file type is supported
      if (!isSupportedPreview(previewFile.file_type)) {
        setError(`Preview not available for ${previewFile.file_extension} files`);
        return;
      }

      // Get download URL from Supabase Storage (signed URL valid for 1 hour)
      const { data, error } = await supabase.storage
        .from('working-area-files')
        .createSignedUrl(previewFile.storage_path, 3600);
      
      if (error) throw error;
      
      setPreviewUrl(data?.signedUrl || '');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preview';
      setError(message);
      showNotification?.(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if file type is supported for preview
  const isSupportedPreview = (fileType?: string): boolean => {
    if (!fileType) return false;

    return (
      SUPPORTED_IMAGE_TYPES.includes(fileType) ||
      SUPPORTED_VIDEO_TYPES.includes(fileType) ||
      SUPPORTED_AUDIO_TYPES.includes(fileType) ||
      SUPPORTED_TEXT_TYPES.includes(fileType) ||
      fileType === 'application/pdf'
    );
  };

  // Get preview component based on file type
  const renderPreview = () => {
    if (!currentFile) return null;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">Cannot preview file</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        </div>
      );
    }

    // Image preview
    if (SUPPORTED_IMAGE_TYPES.includes(currentFile.file_type || '')) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-50">
          <img
            src={previewUrl}
            alt={currentFile.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // PDF preview
    if (currentFile.file_type === 'application/pdf') {
      return (
        <div className="h-96 bg-gray-50">
          <iframe
            src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-full border-none"
            title={currentFile.name}
          />
        </div>
      );
    }

    // Video preview
    if (SUPPORTED_VIDEO_TYPES.includes(currentFile.file_type || '')) {
      return (
        <div className="h-96 bg-black flex items-center justify-center">
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-full"
            controlsList="nodownload"
          />
        </div>
      );
    }

    // Audio preview
    if (SUPPORTED_AUDIO_TYPES.includes(currentFile.file_type || '')) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-50">
          <div className="text-center">
            <audio
              src={previewUrl}
              controls
              className="mb-4"
              controlsList="nodownload"
            />
            <p className="text-sm text-gray-500">{currentFile.name}</p>
          </div>
        </div>
      );
    }

    // Text file preview
    if (SUPPORTED_TEXT_TYPES.includes(currentFile.file_type || '')) {
      return (
        <div className="h-96 bg-gray-50 p-4 overflow-auto">
          <pre className="font-mono text-sm text-gray-900">
            {previewUrl ? <code>{previewUrl}</code> : 'Content loading...'}
          </pre>
        </div>
      );
    }

    return null;
  };

  // Navigate to next file
  const goToNextFile = () => {
    if (!currentFile || allFiles.length === 0) return;

    const currentIndex = allFiles.findIndex((f) => f.id === currentFile.id);
    if (currentIndex < allFiles.length - 1) {
      const nextFile = allFiles[currentIndex + 1];
      setCurrentFile(nextFile);
      loadPreview(nextFile);
    }
  };

  // Navigate to previous file
  const goToPreviousFile = () => {
    if (!currentFile || allFiles.length === 0) return;

    const currentIndex = allFiles.findIndex((f) => f.id === currentFile.id);
    if (currentIndex > 0) {
      const previousFile = allFiles[currentIndex - 1];
      setCurrentFile(previousFile);
      loadPreview(previousFile);
    }
  };

  // Download file
  const handleDownload = async () => {
    if (!currentFile) return;

    try {
      setIsDownloading(true);
      await onDownload?.(currentFile.id);
      showNotification?.('File downloaded successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      showNotification?.(message, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !currentFile) return null;

  const canNavigate = allFiles.length > 1;
  const currentIndex = allFiles.findIndex((f) => f.id === currentFile.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {currentFile.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {(currentFile.size_bytes / 1024 / 1024).toFixed(2)}MB
              {allFiles.length > 1 && ` • ${currentIndex + 1} of ${allFiles.length}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
              title="Download"
            >
              {isDownloading ? (
                <Loader className="w-5 h-5 animate-spin text-gray-600" />
              ) : (
                <Download className="w-5 h-5 text-gray-600 hover:text-gray-900" />
              )}
            </button>

            {/* Share Button */}
            {onShare && (
              <button
                onClick={onShare}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Share"
              >
                <Share2 className="w-5 h-5 text-gray-600 hover:text-gray-900" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600 hover:text-gray-900" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {renderPreview()}
        </div>

        {/* Footer with Navigation */}
        {canNavigate && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
            <button
              onClick={goToPreviousFile}
              disabled={currentIndex === 0}
              className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous file"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-sm text-gray-500">
              {currentIndex + 1} of {allFiles.length}
            </div>

            <button
              onClick={goToNextFile}
              disabled={currentIndex === allFiles.length - 1}
              className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next file"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
