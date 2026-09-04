import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Archive,
  Code,
  Image,
  File,
  LucideIcon,
} from 'lucide-react';

/**
 * File Type Configuration
 * Maps file extensions to colors, icons, and labels for consistent UI display
 */

export interface FileTypeConfig {
  icon: LucideIcon;
  primaryColor: string;        // e.g., 'text-blue-600'
  bgColor: string;             // e.g., 'bg-blue-50'
  borderColor: string;         // e.g., 'border-blue-200'
  iconBgColor: string;         // e.g., 'bg-blue-100'
  label: string;
  tailwindBg: string;          // For dynamic styles
  tailwindBorder: string;
  tailwindText: string;
}

// Define all file type configurations
const FILE_TYPE_CONFIGS: { [key: string]: FileTypeConfig } = {
  // Word Documents
  word: {
    icon: FileText,
    primaryColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBgColor: 'bg-blue-100',
    label: 'Word Document',
    tailwindBg: 'blue-50',
    tailwindBorder: 'blue-200',
    tailwindText: 'blue-600',
  },

  // Excel & Spreadsheets
  excel: {
    icon: FileSpreadsheet,
    primaryColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconBgColor: 'bg-emerald-100',
    label: 'Excel File',
    tailwindBg: 'emerald-50',
    tailwindBorder: 'emerald-200',
    tailwindText: 'emerald-600',
  },

  // CSV Files
  csv: {
    icon: FileSpreadsheet,
    primaryColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconBgColor: 'bg-emerald-100',
    label: 'CSV File',
    tailwindBg: 'emerald-50',
    tailwindBorder: 'emerald-200',
    tailwindText: 'emerald-600',
  },

  // PowerPoint
  powerpoint: {
    icon: Presentation,
    primaryColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconBgColor: 'bg-orange-100',
    label: 'PowerPoint',
    tailwindBg: 'orange-50',
    tailwindBorder: 'orange-200',
    tailwindText: 'orange-600',
  },

  // PDF
  pdf: {
    icon: FileText,
    primaryColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBgColor: 'bg-red-100',
    label: 'PDF Document',
    tailwindBg: 'red-50',
    tailwindBorder: 'red-200',
    tailwindText: 'red-600',
  },

  // Images
  image: {
    icon: Image,
    primaryColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconBgColor: 'bg-purple-100',
    label: 'Image',
    tailwindBg: 'purple-50',
    tailwindBorder: 'purple-200',
    tailwindText: 'purple-600',
  },

  // Archives
  archive: {
    icon: Archive,
    primaryColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconBgColor: 'bg-yellow-100',
    label: 'Archive',
    tailwindBg: 'yellow-50',
    tailwindBorder: 'yellow-200',
    tailwindText: 'yellow-600',
  },

  // Code Files
  code: {
    icon: Code,
    primaryColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    iconBgColor: 'bg-indigo-100',
    label: 'Code File',
    tailwindBg: 'indigo-50',
    tailwindBorder: 'indigo-200',
    tailwindText: 'indigo-600',
  },

  // Text Files
  text: {
    icon: FileText,
    primaryColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    iconBgColor: 'bg-slate-100',
    label: 'Text File',
    tailwindBg: 'slate-50',
    tailwindBorder: 'slate-200',
    tailwindText: 'slate-600',
  },

  // Default/Unknown
  default: {
    icon: File,
    primaryColor: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    iconBgColor: 'bg-slate-200',
    label: 'File',
    tailwindBg: 'slate-100',
    tailwindBorder: 'slate-300',
    tailwindText: 'slate-700',
  },
};

/**
 * Maps file extensions to file type categories
 */
const EXTENSION_MAP: { [key: string]: string } = {
  // Word
  doc: 'word',
  docx: 'word',
  dot: 'word',
  dotx: 'word',

  // Excel
  xls: 'excel',
  xlsx: 'excel',
  xlsm: 'excel',
  xlt: 'excel',
  csv: 'csv',
  tsv: 'csv',

  // PowerPoint
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  pps: 'powerpoint',
  ppsx: 'powerpoint',

  // PDF
  pdf: 'pdf',

  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  svg: 'image',
  webp: 'image',
  ico: 'image',
  bmp: 'image',
  tiff: 'image',

  // Archives
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  gzip: 'archive',

  // Code
  js: 'code',
  ts: 'code',
  jsx: 'code',
  tsx: 'code',
  py: 'code',
  java: 'code',
  cpp: 'code',
  c: 'code',
  h: 'code',
  hpp: 'code',
  css: 'code',
  scss: 'code',
  html: 'code',
  xml: 'code',
  json: 'code',
  yml: 'code',
  yaml: 'code',
  go: 'code',
  rs: 'code',
  php: 'code',
  rb: 'code',
  swift: 'code',
  kt: 'code',

  // Text
  txt: 'text',
  md: 'text',
  markdown: 'text',
  rtf: 'text',
  log: 'text',
};

/**
 * Gets the file type configuration based on file name or MIME type
 * @param fileName - The name of the file (e.g., "document.pdf")
 * @param mimeType - Optional MIME type (e.g., "application/pdf")
 * @returns FileTypeConfig object with icon, colors, and label
 */
export const getFileTypeConfig = (
  fileName: string,
  mimeType?: string
): FileTypeConfig => {
  // Try to get extension from fileName
  if (fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension && EXTENSION_MAP[extension]) {
      return FILE_TYPE_CONFIGS[EXTENSION_MAP[extension]];
    }
  }

  // Try to detect from MIME type if extension didn't match
  if (mimeType) {
    if (mimeType.startsWith('image/')) return FILE_TYPE_CONFIGS.image;
    if (mimeType.startsWith('video/')) return FILE_TYPE_CONFIGS.default;
    if (mimeType.startsWith('audio/')) return FILE_TYPE_CONFIGS.default;

    if (mimeType.includes('wordprocessingml') || mimeType.includes('document'))
      return FILE_TYPE_CONFIGS.word;
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet'))
      return FILE_TYPE_CONFIGS.excel;
    if (mimeType.includes('presentation'))
      return FILE_TYPE_CONFIGS.powerpoint;
    if (mimeType === 'application/pdf') return FILE_TYPE_CONFIGS.pdf;
    if (mimeType.includes('archive') || mimeType.includes('compressed'))
      return FILE_TYPE_CONFIGS.archive;
  }

  // Default fallback
  return FILE_TYPE_CONFIGS.default;
};

/**
 * Get icon component by file name/MIME type
 */
export const getFileIcon = (fileName: string, mimeType?: string) => {
  return getFileTypeConfig(fileName, mimeType).icon;
};

/**
 * Get label by file name/MIME type
 */
export const getFileLabel = (fileName: string, mimeType?: string) => {
  return getFileTypeConfig(fileName, mimeType).label;
};

/**
 * Get primary color class by file name/MIME type
 */
export const getFilePrimaryColor = (fileName: string, mimeType?: string) => {
  return getFileTypeConfig(fileName, mimeType).primaryColor;
};

/**
 * Get background color class by file name/MIME type
 */
export const getFileBgColor = (fileName: string, mimeType?: string) => {
  return getFileTypeConfig(fileName, mimeType).bgColor;
};

/**
 * Get border color class by file name/MIME type
 */
export const getFileBorderColor = (fileName: string, mimeType?: string) => {
  return getFileTypeConfig(fileName, mimeType).borderColor;
};

/**
 * Check if a file is previewable
 */
export const isPreviewable = (fileName: string, mimeType?: string): boolean => {
  const config = getFileTypeConfig(fileName, mimeType);
  const extension = fileName.split('.').pop()?.toLowerCase();

  // Archives cannot be previewed
  if (config.label === 'Archive') return false;

  // All other configured file types are previewable
  return Boolean(
    config.label === 'Image' ||
    config.label === 'PDF Document' ||
    config.label === 'Word Document' ||
    config.label === 'Excel File' ||
    config.label === 'CSV File' ||
    config.label === 'PowerPoint' ||
    config.label === 'Text File' ||
    config.label === 'Code File' ||
    (extension && (
      extension === 'pdf' ||
      extension.match(/^(jpg|jpeg|png|gif|svg|webp|bmp|tiff|ico)$/) ||
      extension.match(/^(doc|docx|dot|dotx)$/) ||
      extension.match(/^(xls|xlsx|xlsm|xlt)$/) ||
      extension.match(/^(csv|tsv)$/) ||
      extension.match(/^(ppt|pptx|pps|ppsx)$/) ||
      extension.match(/^(txt|md|markdown|rtf|log)$/) ||
      extension.match(/^(js|ts|jsx|tsx|py|java|cpp|c|h|hpp|css|scss|html|xml|json|yml|yaml|go|rs|php|rb|swift|kt)$/)
    ))
  );
};

/**
 * Get preview type for a file
 */
export type PreviewType = 'image' | 'pdf' | 'office' | 'text' | 'code' | 'none';

export const getPreviewType = (fileName: string, mimeType?: string): PreviewType => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const config = getFileTypeConfig(fileName, mimeType);

  // PDFs
  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  
  // Images
  if (mimeType?.startsWith('image/')) return 'image';
  if (extension && extension.match(/^(jpg|jpeg|png|gif|svg|webp|bmp|tiff|ico)$/)) return 'image';

  // Office documents (Word, Excel, PowerPoint, CSV)
  if (
    config.label === 'Word Document' ||
    config.label === 'Excel File' ||
    config.label === 'CSV File' ||
    config.label === 'PowerPoint' ||
    extension?.match(/^(doc|docx|dot|dotx|xls|xlsx|xlsm|xlt|csv|tsv|ppt|pptx|pps|ppsx)$/)
  ) {
    return 'office';
  }

  // Text files
  if (
    config.label === 'Text File' ||
    extension?.match(/^(txt|md|markdown|rtf|log)$/) ||
    mimeType?.startsWith('text/')
  ) {
    return 'text';
  }

  // Code files
  if (
    config.label === 'Code File' ||
    extension?.match(/^(js|ts|jsx|tsx|py|java|cpp|c|h|hpp|css|scss|html|xml|json|yml|yaml|go|rs|php|rb|swift|kt)$/)
  ) {
    return 'code';
  }

  return 'none';
};
