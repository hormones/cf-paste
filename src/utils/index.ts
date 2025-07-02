import { useAppStore } from '@/stores'
import Cookies from 'js-cookie'
import { LocalStorage } from './storage'

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
  /**
   * 将 Cookie 中的数据同步到 LocalStorage
   */
  cookies2Localstorage() {
    const store = useAppStore()
    const authorization = Cookies.get('authorization')
    const key = store.keyword.word || store.keyword.view_word
    if (key) {
      LocalStorage.set(key, { timestamp: Date.now(), authorization })
    }
  },
  /**
   * 将 LocalStorage 中的数据同步到 Cookie
   */
  localstorage2Cookies() {
    const store = useAppStore()
    // 同步word和view_word
    void (store.keyword.word ? Cookies.set('word', store.keyword.word) : Cookies.remove('word'))
    void (store.keyword.view_word ? Cookies.set('view_word', store.keyword.view_word) : Cookies.remove('view_word'))

    // 同步authorization
    const key = store.keyword.word || store.keyword.view_word
    if (key) {
      const data: any = LocalStorage.get(key) || {}
      void (data.authorization
        ? Cookies.set('authorization', data.authorization)
        : Cookies.remove('authorization'))
    }
  },
  /**
   * 清理本地存储和 Cookie
   */
  clearLocalStorageAndCookies() {
    const store = useAppStore()
    const key = store.keyword.word || store.keyword.view_word
    if (key) {
      LocalStorage.remove(key)
    }
    Cookies.remove('word')
    Cookies.remove('view_word')
    Cookies.remove('authorization')
  },
}

/**
 * 计算平滑的上传速率和剩余时间
 * @param fileSize 文件总大小
 * @param uploadedBytes 已上传字节数
 * @param speedHistory 速度历史记录
 * @returns 速率和剩余时间信息
 */
export function calculateUploadStats(
  fileSize: number,
  uploadedBytes: number,
  speedHistory: Array<{ timestamp: number; uploadedBytes: number }>
): {
  uploadSpeed: number
  remainingTime: number
} {
  // 如果历史记录少于2个点，无法计算速率
  if (speedHistory.length < 2) {
    return {
      uploadSpeed: 0,
      remainingTime: 0
    }
  }

  // 计算最近几个点的平均速率
  const speeds: number[] = []

  for (let i = 1; i < speedHistory.length; i++) {
    const prev = speedHistory[i - 1]
    const curr = speedHistory[i]
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000 // 转换为秒
    const bytesDiff = curr.uploadedBytes - prev.uploadedBytes

    if (timeDiff > 0) {
      speeds.push(bytesDiff / timeDiff) // 字节/秒
    }
  }

  // 计算平均速率
  const avgSpeed = speeds.length > 0
    ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
    : 0

  // 计算剩余时间
  const remainingBytes = fileSize - uploadedBytes
  const remainingTime = avgSpeed > 0 ? remainingBytes / avgSpeed : 0

  return {
    uploadSpeed: Math.max(0, avgSpeed),
    remainingTime: Math.max(0, remainingTime)
  }
}

/**
 * 更新速度历史记录（保持最近5次）
 * @param speedHistory 当前历史记录
 * @param timestamp 时间戳
 * @param uploadedBytes 已上传字节数
 * @returns 更新后的历史记录
 */
export function updateSpeedHistory(
  speedHistory: Array<{ timestamp: number; uploadedBytes: number }>,
  timestamp: number,
  uploadedBytes: number
): Array<{ timestamp: number; uploadedBytes: number }> {
  const newHistory = [...speedHistory, { timestamp, uploadedBytes }]

  // 保持最近5次记录
  if (newHistory.length > 5) {
    newHistory.shift()
  }

  return newHistory
}

/**
 * 格式化上传速率显示
 * @param bytesPerSecond 字节每秒
 * @returns 格式化的速率字符串
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  let size = bytesPerSecond
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * 格式化剩余时间显示
 * @param seconds 剩余秒数
 * @returns 格式化的时间字符串
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '计算中...'

  if (seconds < 60) {
    return `${Math.ceil(seconds)}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.ceil(seconds % 60)
    return `${minutes}分${remainingSeconds}秒`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}小时${minutes}分钟`
  }
}
