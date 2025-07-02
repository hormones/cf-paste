/**
 * 通用工具函数集合
 * @module utils/index
 */

/**
 * 工具函数集合
 */
export const Utils = {
  /**
   * 生成随机ID
   * 替代crypto.randomUUID()的通用解决方案
   * @param format ID格式类型
   * @param length 自定义长度（仅在format为'custom'时生效）
   * @returns 生成的随机ID
   * @example
   * generateId() // "a1b2c3d4-e5f6-7890-abcd-ef1234567890" (UUID格式)
   * generateId('short') // "a1b2c3d4" (8位短ID)
   * generateId('long') // "a1b2c3d4e5f67890abcdef1234567890" (32位长ID)
   * generateId('timestamp') // "1703084400000-a1b2c3" (时间戳+随机数)
   * generateId('custom', 16) // "a1b2c3d4e5f67890" (自定义16位)
   */
  generateId(format: 'uuid' | 'short' | 'long' | 'timestamp' | 'custom' = 'uuid', length = 8): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    const hexChars = '0123456789abcdef'

    /**
     * 生成指定长度的随机字符串
     * @param len 长度
     * @param charset 字符集
     */
    const randomString = (len: number, charset = chars): string => {
      let result = ''
      for (let i = 0; i < len; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length))
      }
      return result
    }

    switch (format) {
      case 'uuid':
        // 模拟UUID格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        return [
          randomString(8, hexChars),
          randomString(4, hexChars),
          '4' + randomString(3, hexChars), // 版本号固定为4
          ((Math.floor(Math.random() * 4) + 8).toString(16) + randomString(3, hexChars)), // 变体位
          randomString(12, hexChars)
        ].join('-')

      case 'short':
        // 8位短ID
        return randomString(8, hexChars)

      case 'long':
        // 32位长ID
        return randomString(32, hexChars)

      case 'timestamp':
        // 时间戳 + 7位随机数
        return Date.now().toString() + '-' + randomString(7, hexChars)

      case 'custom':
        // 自定义长度
        return randomString(length, hexChars)

      default:
        return randomString(8, hexChars)
    }
  },

  /**
   * 生成指定长度的随机字符串（仅字母数字）
   * @param length 字符串长度
   * @param options 选项配置
   * @returns 随机字符串
   * @example
   * getRandomWord(6) // "a1b2c3"
   * getRandomWord(8, { uppercase: true }) // "A1B2C3D4"
   * getRandomWord(10, { numbers: false }) // "abcdefghij"
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

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789' // 默认字符集

    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },

  /**
   * 将字节数转换为人类可读的文件大小
   * @example
   * humanReadableSize(1024) // "1.00 KB"
   * humanReadableSize(1234567) // "1.18 MB"
   * @param size 字节数
   * @returns 格式化后的文件大小
   */
  humanReadableSize(size: number) {
    if (size === 0) return '0 B'
    const i = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / Math.pow(1024, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`
  },

  /**
   * 解析Range请求头
   * @param range Range请求头
   * @param totalSize 文件总大小
   * @returns 解析后的起始位置和结束位置
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
