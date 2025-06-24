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
  cookies2LocalStorage() {
    const store = useWordStore()
    const authorization = Cookies.get('authorization')
    LocalStorage.set(store.word || store.view_word, { timestamp: Date.now(), authorization })
  },
  localstorage2Cookies() {
    const store = useWordStore()
    void (store.word ? Cookies.set('word', store.word) : Cookies.remove('word'))
    void (store.view_word ? Cookies.set('view_word', store.view_word) : Cookies.remove('view_word'))

    const data: any = LocalStorage.get(store.word || store.view_word) || {}
    void (data.authorization
      ? Cookies.set('authorization', data.authorization)
      : Cookies.remove('authorization'))
  },
  clearLocalStorageAndCookies() {
    const store = useWordStore()
    LocalStorage.remove(store.word || store.view_word)
    Cookies.remove('word')
    Cookies.remove('view_word')
    Cookies.remove('authorization')
  },
}
