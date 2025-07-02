/**
 * 项目共享常量
 * 统一前后端常量定义，避免重复
 */

// 过期时间选项（包含前端显示和后端验证）
export const EXPIRY_OPTIONS = [
  { label: '1小时', value: 60 * 60 },
  { label: '1天', value: 24 * 60 * 60 },
  { label: '3天', value: 3 * 24 * 60 * 60 },
  { label: '1周', value: 7 * 24 * 60 * 60 },
  { label: '1个月', value: 30 * 24 * 60 * 60 },
  { label: '3个月', value: 90 * 24 * 60 * 60 },
] as const

// 存储相关常量
export const STORAGE_CONSTANTS = {
  PASTE_FILE: 'index.txt',
  FILE_FOLDER: 'files',
  TEMPLATE_FOLDER: 'templates',
} as const

// 保留字
export const RESERVED_WORDS = [
  'index', 'main', 'config', 'utils', 'views', 'public',
  'pages', 'admin', 'template', 'templates', 'file', 'files',
] as const

// 基础常量
export const BASE_CONSTANTS = {
  WORD: 'word',
  AUTH: 'auth',
  PASSWORD_DISPLAY: '******',
} as const

// 消息常量
export const MESSAGES = {
  NO_CONTENT: '请输入内容或上传文件',
  SAVE_SUCCESS: '保存成功',
  SAVE_FAILED: '保存失败',
  UPLOAD_SUCCESS: '上传成功',
  UPLOAD_FAILED: '上传失败',
  UPLOAD_CANCELLED: '上传已取消',
  DELETE_SUCCESS: '删除成功',
  DELETE_FAILED: '删除失败',
  SETTINGS_SAVED: '设置已保存',
  SETTINGS_FAILED: '设置保存失败',
  FETCH_FAILED: '获取内容失败',
  DOWNLOAD_FAILED: '下载失败',
} as const

// 向后兼容的统一导出
export const Constant = {
  ...BASE_CONSTANTS,
  ...STORAGE_CONSTANTS,
  REVERSED_WORDS: RESERVED_WORDS,
  EXPIRY_OPTIONS,
  // 后端验证用：直接提取values数组
  ALLOWED_EXPIRE_VALUES: EXPIRY_OPTIONS.map(opt => opt.value),
  MESSAGES,
} as const
