import { useWordStore } from '@/stores'
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
    const store = useWordStore()
    const authorization = Cookies.get('authorization')
    const key = store.word || store.view_word
    if (key) {
      LocalStorage.set(key, { timestamp: Date.now(), authorization })
    }
  },
  /**
   * 将 LocalStorage 中的数据同步到 Cookie
   */
  localstorage2Cookies() {
    const store = useWordStore()
    // 同步word和view_word
    void (store.word ? Cookies.set('word', store.word) : Cookies.remove('word'))
    void (store.view_word ? Cookies.set('view_word', store.view_word) : Cookies.remove('view_word'))

    // 同步authorization
    const key = store.word || store.view_word
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
    const store = useWordStore()
    const key = store.word || store.view_word
    if (key) {
      LocalStorage.remove(key)
    }
    Cookies.remove('word')
    Cookies.remove('view_word')
    Cookies.remove('authorization')
  },
}
