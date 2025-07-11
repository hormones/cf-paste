import { useI18n as useVueI18n } from '../i18n'

/**
 * Frontend translation function wrapper
 * Provides convenient translation functionality and localization options
 */
export function useI18nComposable() {
  const { t, getExpiryOptions, getCurrentLanguage, updateI18nLocale, initializeLanguage, locale } = useVueI18n()

  return {
    // Translation function
    t,

    // reactive locale
    locale,

    // Get localized expiry time options
    getExpiryOptions,

    // Language management functions
    getCurrentLanguage,
    updateI18nLocale,
    initializeLanguage,
  }
}

// Export types
export type { ExpiryOption } from '../../shared/constants'
