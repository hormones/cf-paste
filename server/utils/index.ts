import { IRequest } from "../types"

export const Utils = {
  /**
   * Generate random ID with different formats
   * Universal solution to replace crypto.randomUUID()
   */
  generateId(
    format: 'uuid' | 'short' | 'long' | 'timestamp' | 'custom' = 'uuid',
    length = 8
  ): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    const hexChars = '0123456789abcdef'

    const randomString = (len: number, charset = chars): string => {
      let result = ''
      for (let i = 0; i < len; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length))
      }
      return result
    }

    switch (format) {
      case 'uuid':
        // Simulate UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        return [
          randomString(8, hexChars),
          randomString(4, hexChars),
          '4' + randomString(3, hexChars), // Version fixed to 4
          (Math.floor(Math.random() * 4) + 8).toString(16) + randomString(3, hexChars), // Variant bits
          randomString(12, hexChars),
        ].join('-')

      case 'short':
        return randomString(8, hexChars)

      case 'long':
        return randomString(32, hexChars)

      case 'timestamp':
        // Timestamp + 7 random characters
        return Date.now().toString() + '-' + randomString(7, hexChars)

      case 'custom':
        return randomString(length, hexChars)

      default:
        return randomString(8, hexChars)
    }
  },

  /**
   * Generate random alphanumeric string with configurable options
   */
  getRandomWord(
    length: number,
    options: {
      uppercase?: boolean
      lowercase?: boolean
      numbers?: boolean
    } = {}
  ): string {
    const { uppercase = false, lowercase = true, numbers = true } = options

    let chars = ''
    if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (numbers) chars += '0123456789'

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789' // Default charset

    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },

  /**
   * Convert bytes to human readable file size
   */
  humanReadableSize(size: number) {
    if (size === 0) return '0 B'
    const i = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / Math.pow(1024, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`
  },

  /**
   * Parse Range request header
   * Supports formats: bytes=start-end, bytes=start-, bytes=-suffix
   */
  parseRange: (range: string, totalSize: number) => {
    if (!range || !range.startsWith('bytes=')) {
      return null
    }

    const rangeSpec = range.replace(/bytes=/, '')

    // Handle suffix-byte-range-spec (e.g., bytes=-500)
    if (rangeSpec.startsWith('-')) {
      const suffix = parseInt(rangeSpec.substring(1), 10)
      if (isNaN(suffix) || suffix <= 0) return null

      const start = Math.max(0, totalSize - suffix)
      return {
        start,
        end: totalSize - 1,
      }
    }

    // Handle byte-range-spec (e.g., bytes=200-1023 or bytes=200-)
    const [startStr, endStr] = rangeSpec.split('-')
    const start = parseInt(startStr, 10)

    if (isNaN(start) || start < 0) return null

    let end: number
    if (endStr === '' || endStr === undefined) {
      // bytes=200- (from start to end of file)
      end = totalSize - 1
    } else {
      end = parseInt(endStr, 10)
      if (isNaN(end) || end < start) return null
      // Ensure end doesn't exceed file size
      end = Math.min(end, totalSize - 1)
    }

    // Ensure start doesn't exceed file size
    if (start >= totalSize) return null

    return {
      start,
      end,
    }
  },
  extractPathVariables: (pattern: string, path: string): Record<string, string> => {
    const variables: Record<string, string> = {}
    const sp = path.split('?')
    path = sp[0]
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = path.split('/').filter(Boolean)
    if (patternParts.length !== pathParts.length) return variables
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const key = patternParts[i].substring(1)
        variables[key] = pathParts[i]
      }
    }
    return variables
  },
  getCookie: (req: IRequest, name: string): string | null => {
    const cookies = req.getHeader('Cookie')
    if (!cookies) return null
    const cookie = cookies.split(';').find((c) => c.trim().startsWith(`${name}=`))
    return cookie ? cookie.split('=')[1] : null
  },
  setCookie: (name: string, value: string, req: IRequest) => {
    const path = req.edit ? req.word : 'v/' + req.view_word
    return `${name}=${value}; Path=/api/${path}; HttpOnly; SameSite=Lax; Max-Age=86400`
  },
}
