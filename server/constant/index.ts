import { EXPIRY_OPTIONS } from '../../constants'

export {
  Constant,
  EXPIRY_OPTIONS,
  STORAGE_CONSTANTS,
  RESERVED_WORDS,
  BASE_CONSTANTS,
  MESSAGES
} from '../../constants'

// Server-specific: export only allowed expiry time values for validation
export const ALLOWED_EXPIRE_VALUES = EXPIRY_OPTIONS.map(opt => opt.value)
