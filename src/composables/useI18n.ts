import { useI18n as useVueI18n } from '../i18n'

/**
 * 前端翻译函数包装器
 * 提供便捷的翻译功能和本地化选项
 */
export function useI18nComposable() {
  const { t, getExpiryOptions, getCurrentLanguage, updateI18nLocale, initializeLanguage } = useVueI18n()

  return {
    // 翻译函数
    t,

    // 获取本地化的过期时间选项
    getExpiryOptions,

    // 语言管理函数
    getCurrentLanguage,
    updateI18nLocale,
    initializeLanguage,
  }
}

// 导出类型
export type { ExpiryOption } from '../../shared/constants'
