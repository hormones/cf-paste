export const Utils = {
  // 生成随机word
  getRandomWord: (length = 6): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('')
  },
  // 验证word格式
  isValidWord: (word: string): boolean => {
    return /^[a-zA-Z0-9_]{4,20}$/.test(word)
  },
  // 将字节数转换为人类可读的文件大小
  humanReadableSize(size: number) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
  },
}
