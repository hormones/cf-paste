import { createI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { messages } from '../../shared/locales'
import type { MessageSchema } from '../../shared/locales'
import { EXPIRY_VALUES, type ExpiryOption } from '../../shared/constants'

// 创建 i18n 实例
export const i18n = createI18n({
  legacy: false, // 使用组合式 API 模式
  locale: 'en', // 默认语言，会在应用启动后根据服务端检测结果更新
  fallbackLocale: 'en', // 回退语言
  messages,
  globalInjection: true // 允许在模板中直接使用 $t
})

/**
 * 组合式 API 包装器，提供响应式的语言切换支持
 */
export function useI18n() {
  const appStore = useAppStore()

  // 获取当前语言，优先从配置中读取
  const getCurrentLanguage = (): 'en' | 'zh-CN' => {
    const configLanguage = appStore.pasteConfig?.language

    // 如果配置中有语言信息，使用配置的语言
    if (configLanguage) {
      return configLanguage as 'en' | 'zh-CN'
    }

    // 默认使用英语
    return 'en'
  }

  // 更新 i18n 实例的语言设置
  const updateI18nLocale = (locale: 'en' | 'zh-CN') => {
    i18n.global.locale.value = locale as any
  }

  // 初始化语言设置
  const initializeLanguage = () => {
    const currentLanguage = getCurrentLanguage()
    updateI18nLocale(currentLanguage)
  }

  // 获取本地化的过期时间选项
  const getExpiryOptions = (): ExpiryOption[] => {
    return EXPIRY_VALUES.map(option => ({
      label: i18n.global.t(`common.time.expiry.${option.key}`),
      value: option.value
    }))
  }

  return {
    getCurrentLanguage,
    updateI18nLocale,
    initializeLanguage,
    getExpiryOptions,
    // 导出 i18n 的 t 函数
    t: i18n.global.t,
    locale: i18n.global.locale
  }
}
