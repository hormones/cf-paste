import { createI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { messages } from '../../shared/locales'
import { EXPIRY_VALUES, type ExpiryOption } from '../../shared/constants'

// Create i18n instance
export const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: 'en', // Default language, will be updated based on server detection result after app startup
  fallbackLocale: 'en', // Fallback language
  messages,
  globalInjection: true, // Allow direct use of $t in templates
})

/**
 * Composition API wrapper providing reactive language switching support
 */
export function useI18n() {
  const appStore = useAppStore()

  // Get current language, prioritize reading from config
  const getCurrentLanguage = (): 'en' | 'zh-CN' => {
    const configLanguage = appStore.pasteConfig?.language

    // If there's language info in config, use the configured language
    if (configLanguage) {
      return configLanguage as 'en' | 'zh-CN'
    }

    // Default to English
    return 'en'
  }

  // Update browser title
  const updateDocumentTitle = () => {
    document.title = i18n.global.t('app.title')
  }

  // Update i18n instance language setting
  const updateI18nLocale = (locale: 'en' | 'zh-CN') => {
    i18n.global.locale.value = locale as any
  }

  // Initialize language settings
  const initializeLanguage = () => {
    const currentLanguage = getCurrentLanguage()
    updateI18nLocale(currentLanguage)
    updateDocumentTitle()
  }

  // Get localized expiry time options
  const getExpiryOptions = (): ExpiryOption[] => {
    // Map EXPIRY_VALUES keys to time keys in language files
    const keyMapping = {
      '1hour': '1h',
      '1day': '1d',
      '3days': '3d',
      '1week': '1w',
      '1month': '1m',
      '3months': '3m',
    } as const

    return EXPIRY_VALUES.map((option) => ({
      label: i18n.global.t(`common.time.${keyMapping[option.key as keyof typeof keyMapping]}`),
      value: option.value,
    }))
  }

  return {
    getCurrentLanguage,
    updateI18nLocale,
    initializeLanguage,
    getExpiryOptions,
    // Export i18n's t function
    t: i18n.global.t,
    locale: i18n.global.locale,
  }
}

// Export types
export type { ExpiryOption } from '../../shared/constants'
