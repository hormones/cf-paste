import { EXPIRY_VALUES } from '../../shared/constants'

export {
  Constant,
  EXPIRY_VALUES,
  STORAGE_CONSTANTS,
  RESERVED_WORDS,
  BASE_CONSTANTS
} from '../../shared/constants'

// Server-specific: export only allowed expiry time values for validation
export const ALLOWED_EXPIRE_VALUES = EXPIRY_VALUES.map(opt => opt.value)
