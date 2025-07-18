export const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: 'common.time.1hour', value: 60 * 60 },
  { label: 'common.time.1day', value: 24 * 60 * 60 },
  { label: 'common.time.3days', value: 3 * 24 * 60 * 60 },
  { label: 'common.time.1week', value: 7 * 24 * 60 * 60 },
  { label: 'common.time.1month', value: 30 * 24 * 60 * 60 },
  { label: 'common.time.3months', value: 90 * 24 * 60 * 60 },
  { label: 'common.time.1year', value: 365 * 24 * 60 * 60 },
  { label: 'common.time.2years', value: 2 * 365 * 24 * 60 * 60 },
]

export const EXPIRY_VALUES = EXPIRY_OPTIONS.map(opt => opt.value);

export const RESERVED_WORDS = [
  'index', 'main', 'config', 'utils', 'views', 'public',
  'pages', 'admin', 'template', 'templates', 'file', 'files',
]

export const Constant = {
  WORD: 'word',
  AUTH: 'auth',
  PASSWORD_DISPLAY: '******',
  PASTE_FILE: 'index.txt',
  FILE_FOLDER: 'files',
  TEMPLATE_FOLDER: 'templates',
}


export const DEFAULT_CONFIG = {
  MAX_FILE_SIZE: 300,
  MAX_TOTAL_SIZE: 300,
  MAX_FILES: 10,
  CHUNK_SIZE: 1024 * 1024,
  CHUNK_THRESHOLD: 1024 * 1024,
  LANGUAGE: 'auto',
}
