import { useWordStore } from '@/stores'
import Cookies from 'js-cookie'

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
  cookies2Store() {
    const store = useWordStore()
    const timestamp = Cookies.get('timestamp')
    const authorization = Cookies.get('authorization')
    if (timestamp) {
      store.setTimestamp(timestamp)
    }
    if (authorization) {
      store.setAuthorization(authorization)
    }
  },
  store2Cookies() {
    const store = useWordStore()
    if (store.word) {
      Cookies.set('word', store.word)
    }
    if (store.view_word) {
      Cookies.set('view_word', store.view_word)
    }
    if (store.authorization) {
      Cookies.set('authorization', store.authorization)
    }
    if (store.timestamp) {
      Cookies.set('timestamp', store.timestamp)
    }
  },
  clearStoreAndCookies() {
    const store = useWordStore()
    store.setTimestamp('')
    store.setAuthorization('')
    store.setViewWord('')
    Cookies.remove('authorization')
    Cookies.remove('timestamp')
  },
}
