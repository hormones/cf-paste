import { createI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { messages } from '../../shared/locales'

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

  return {
    getCurrentLanguage,
    updateI18nLocale,
    initializeLanguage,
    t: i18n.global.t,
    locale: i18n.global.locale,
  }
}
