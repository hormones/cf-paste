// Expiration time options (includes frontend display and backend validation)
export const EXPIRY_OPTIONS = [
  { label: '1 hour', value: 60 * 60 },
  { label: '1 day', value: 24 * 60 * 60 },
  { label: '3 days', value: 3 * 24 * 60 * 60 },
  { label: '1 week', value: 7 * 24 * 60 * 60 },
  { label: '1 month', value: 30 * 24 * 60 * 60 },
  { label: '3 months', value: 90 * 24 * 60 * 60 },
] as const

// Storage related constants
export const STORAGE_CONSTANTS = {
  PASTE_FILE: 'index.txt',
  FILE_FOLDER: 'files',
  TEMPLATE_FOLDER: 'templates',
} as const

// Reserved words
export const RESERVED_WORDS = [
  'index', 'main', 'config', 'utils', 'views', 'public',
  'pages', 'admin', 'template', 'templates', 'file', 'files',
] as const

// Base constants
export const BASE_CONSTANTS = {
  WORD: 'word',
  AUTH: 'auth',
  PASSWORD_DISPLAY: '******',
} as const

// Message constants
export const MESSAGES = {
  NO_CONTENT: 'Please enter content or upload files',
  SAVE_SUCCESS: 'Saved successfully',
  SAVE_FAILED: 'Save failed',
  UPLOAD_SUCCESS: 'Upload successful',
  UPLOAD_FAILED: 'Upload failed',
  UPLOAD_CANCELLED: 'Upload cancelled',
  DELETE_SUCCESS: 'Deleted successfully',
  DELETE_FAILED: 'Delete failed',
  SETTINGS_SAVED: 'Settings saved',
  SETTINGS_FAILED: 'Settings save failed',
  FETCH_FAILED: 'Failed to fetch content',
  DOWNLOAD_FAILED: 'Download failed',
} as const

// Unified export for backward compatibility
export const Constant = {
  ...BASE_CONSTANTS,
  ...STORAGE_CONSTANTS,
  REVERSED_WORDS: RESERVED_WORDS,
  EXPIRY_OPTIONS,
  // For backend validation: directly extract values array
  ALLOWED_EXPIRE_VALUES: EXPIRY_OPTIONS.map(opt => opt.value),
  MESSAGES,
} as const
