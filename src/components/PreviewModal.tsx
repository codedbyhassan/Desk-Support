import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { getPreviewType, PreviewType } from '@/lib/fileTypeConfig';

interface PreviewModalProps {
  isOpen: boolean;
  item: {
    name: string;
    storage_path: string;
    file_type?: string;
  };
  onClose: () => void;
  getSignedUrl: (path: string) => Promise<string>;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  item,
  onClose,
  getSignedUrl,
}) => {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [textContent, setTextContent] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && item) {
      loadPreview();
    } else {
      // Reset state when modal closes
      setSignedUrl(null);
      setTextContent(null);
      setError(null);
    }
  }, [isOpen, item]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = await getSignedUrl(item.storage_path);
      setSignedUrl(url);
      
      const previewType = getPreviewType(item.name, item.file_type);
      
      // For text and code files, fetch the content
      if (previewType === 'text' || previewType === 'code') {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const content = await response.text();
            setTextContent(content);
          }
        } catch (err) {
          console.warn('Failed to fetch text content:', err);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const previewType = getPreviewType(item.name, item.file_type);

  // Generate Google Docs Viewer URL for Office documents
  const getOfficeViewerUrl = (url: string): string => {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="inline-flex animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-900/30 border-t-blue-600 dark:border-t-blue-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center p-8">
            <p className="text-red-600 dark:text-red-400 mb-4 font-medium">
              Unable to load preview
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {error}
            </p>
            {signedUrl && (
              <a
                href={signedUrl}
                download={item.name}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download size={18} />
                Download File
              </a>
            )}
          </div>
        </div>
      );
    }

    if (!signedUrl) return null;

    switch (previewType) {
      case 'image':
        return (
          <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 h-full min-h-[400px]">
            <img
              src={signedUrl}
              alt={item.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onError={() => setError('Failed to load image')}
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="h-full w-full">
            <iframe
              src={signedUrl}
              className="w-full h-full border-none"
              title={item.name}
            />
          </div>
        );

      case 'office':
        // Try multiple preview methods for better compatibility
        const extension = item.name.split('.').pop()?.toLowerCase();
        const isExcel = extension === 'xls' || extension === 'xlsx' || extension === 'xlsm' || extension === 'csv' || extension === 'tsv';
        
        // For Excel files, try Microsoft Office Online viewer first, then Google Docs
        const excelViewerUrl = isExcel 
          ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`
          : getOfficeViewerUrl(signedUrl);
        
        return (
          <div className="h-full w-full relative">
            <iframe
              key={signedUrl} // Force re-render on URL change
              src={excelViewerUrl}
              className="w-full h-full border-none"
              title={item.name}
              onLoad={() => {
                // Check if iframe loaded successfully
                const iframe = document.querySelector('iframe[title="' + item.name + '"]') as HTMLIFrameElement;
                if (iframe && iframe.contentWindow) {
                  try {
                    // If we can't access content, it might have loaded
                    iframe.contentWindow.location;
                  } catch (e) {
                    // Cross-origin, which is expected - means it loaded
                  }
                }
              }}
              onError={() => {
                // If first method fails, try Google Docs Viewer as fallback
                if (isExcel) {
                  const fallbackUrl = getOfficeViewerUrl(signedUrl);
                  const iframe = document.querySelector('iframe[title="' + item.name + '"]') as HTMLIFrameElement;
                  if (iframe) {
                    iframe.src = fallbackUrl;
                  }
                } else {
                  setError('Failed to load document preview. The file may be too large or in an unsupported format.');
                }
              }}
            />
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg shadow-md hover:shadow-lg transition-colors border border-slate-200 dark:border-slate-700"
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        );

      case 'text':
      case 'code':
        return (
          <div className="h-full min-h-[400px] bg-slate-50 dark:bg-slate-900">
            <div className="h-full overflow-auto p-6">
              {textContent !== null ? (
                <pre className="text-sm font-mono text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                  {textContent}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-flex animate-spin rounded-full h-8 w-8 border-4 border-blue-200 dark:border-blue-900/30 border-t-blue-600 dark:border-t-blue-400 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Loading content...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center p-8">
              <p className="text-slate-600 dark:text-slate-400 mb-4 font-medium">
                Preview not available for this file type
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
                Please download the file to view it.
              </p>
              <a
                href={signedUrl}
                download={item.name}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download size={18} />
                Download File
              </a>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-[95vw] h-[95vh] mx-4 rounded-lg bg-white dark:bg-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white truncate">
              {item.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {previewType !== 'none' ? 'Preview' : 'File Viewer'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {signedUrl && previewType !== 'none' && (
              <a
                href={signedUrl}
                download={item.name}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                title="Download"
              >
                <Download size={20} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};
