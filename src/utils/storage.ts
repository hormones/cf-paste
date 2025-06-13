const KEY_PREFIX = 'KEYWORD:'

/**
 * 遍历LocalStorage中的keyword，清理7天前的LocalStorage
 */
removeExpiredKeyword()
function removeExpiredKeyword() {
  // 获取当前时间戳
  const now = Date.now()
  // 7天的毫秒数
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

  // 遍历 localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(KEY_PREFIX)) continue

    try {
      const value = localStorage.getItem(key)
      if (!value) continue

      const data = JSON.parse(value)
      // 检查是否有 timestamp 字段且是否超过7天
      if (!data || !data.timestamp || now - Number(data.timestamp) > SEVEN_DAYS) {
        console.log('localStorage移除key: ', key)
        localStorage.removeItem(key)
      }
    } catch (_error: any) {
      // 如果解析失败，直接移除
      console.warn('localStorage解析失败, 直接移除: ', key)
      localStorage.removeItem(key)
    }
  }
}

/**
 * LocalStorage存储工具类
 */
export const LocalStorage = {
  get<T>(key: string): T | null {
    key = KEY_PREFIX + key
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  },
  set(key: string, value: any) {
    key = KEY_PREFIX + key
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value))
    } else {
      localStorage.setItem(key, value)
    }
  },
  remove(key: string) {
    key = KEY_PREFIX + key
    localStorage.removeItem(key)
  },
}
