// Expiry time value constants (no i18n needed)
export const EXPIRY_VALUES = [
  { key: '1hour', value: 60 * 60 },
  { key: '1day', value: 24 * 60 * 60 },
  { key: '3days', value: 3 * 24 * 60 * 60 },
  { key: '1week', value: 7 * 24 * 60 * 60 },
  { key: '1month', value: 30 * 24 * 60 * 60 },
  { key: '3months', value: 90 * 24 * 60 * 60 },
  { key: '1year', value: 365 * 24 * 60 * 60 },
  { key: '2years', value: 2 * 365 * 24 * 60 * 60 },
] as const

// Function type for creating localized expiry options
export type ExpiryOption = { label: string; value: number }
export type GetExpiryOptionsFunction = () => ExpiryOption[]

export const STORAGE_CONSTANTS = {
  PASTE_FILE: 'index.txt',
  FILE_FOLDER: 'files',
  TEMPLATE_FOLDER: 'templates',
} as const

export const RESERVED_WORDS = [
  'index', 'main', 'config', 'utils', 'views', 'public',
  'pages', 'admin', 'template', 'templates', 'file', 'files',
] as const

export const BASE_CONSTANTS = {
  WORD: 'word',
  AUTH: 'auth',
  PASSWORD_DISPLAY: '******',
} as const

// Markdown mode constants
export const MARKDOWN_MODE = {
  EDIT: 'edit',
  PREVIEW: 'preview',
  FULLSCREEN: 'fullscreen',
} as const

// MESSAGES constants removed, now using Vue I18n translation functions

export const Constant = {
  ...BASE_CONSTANTS,
  ...STORAGE_CONSTANTS,
  MARKDOWN_MODE,
  REVERSED_WORDS: RESERVED_WORDS,
  EXPIRY_VALUES,
  ALLOWED_EXPIRE_VALUES: EXPIRY_VALUES.map(opt => opt.value),
} as const
