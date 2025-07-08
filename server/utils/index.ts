export const Utils = {
  /**
   * Generate random ID with different formats
   * Universal solution to replace crypto.randomUUID()
   */
  generateId(format: 'uuid' | 'short' | 'long' | 'timestamp' | 'custom' = 'uuid', length = 8): string {
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
          ((Math.floor(Math.random() * 4) + 8).toString(16) + randomString(3, hexChars)), // Variant bits
          randomString(12, hexChars)
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
    const {
      uppercase = false,
      lowercase = true,
      numbers = true
    } = options

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
   */
  parseRange: (range: string, totalSize: number) => {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : totalSize - 1

    return {
      start: isNaN(start) ? 0 : start,
      end: isNaN(end) ? totalSize - 1 : end,
    }
  },
}
