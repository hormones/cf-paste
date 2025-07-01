/**
 * 后端常量导出
 * 从根目录的共享常量文件导入，避免重复定义
 */
import { EXPIRY_OPTIONS } from '../../constants'

export {
  Constant,
  EXPIRY_OPTIONS,
  STORAGE_CONSTANTS,
  RESERVED_WORDS,
  BASE_CONSTANTS,
  MESSAGES
} from '../../constants'

// 后端专用：只导出允许的过期时间值数组（用于验证）
export const ALLOWED_EXPIRE_VALUES = EXPIRY_OPTIONS.map(opt => opt.value)
