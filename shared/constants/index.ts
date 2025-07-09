// 过期时间值常量（不需要国际化）
export const EXPIRY_VALUES = [
  { key: '1hour', value: 60 * 60 },
  { key: '1day', value: 24 * 60 * 60 },
  { key: '3days', value: 3 * 24 * 60 * 60 },
  { key: '1week', value: 7 * 24 * 60 * 60 },
  { key: '1month', value: 30 * 24 * 60 * 60 },
  { key: '3months', value: 90 * 24 * 60 * 60 },
] as const

// 创建本地化过期选项的函数类型
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

// MESSAGES 常量已移除，现在使用 Vue I18n 翻译函数

export const Constant = {
  ...BASE_CONSTANTS,
  ...STORAGE_CONSTANTS,
  REVERSED_WORDS: RESERVED_WORDS,
  EXPIRY_VALUES,
  ALLOWED_EXPIRE_VALUES: EXPIRY_VALUES.map(opt => opt.value),
} as const
