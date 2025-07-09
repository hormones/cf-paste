import { messages } from '../../shared/locales'
import type { MessageSchema } from '../../shared/locales'

/**
 * Server-side lightweight translation function
 *
 * @param key - Translation key, supports nested paths like 'errors.fileNotFound'
 * @param language - Target language, defaults to 'en'
 * @param params - Optional interpolation parameter object
 * @returns Translated text
 *
 * @example
 * t('errors.fileNotFound', 'zh-CN') // Returns Chinese error message
 * t('messages.uploadSuccess', 'en', { filename: 'test.txt' }) // Supports parameter interpolation
 */
export function t(
  key: string,
  language: string = 'en',
  params?: Record<string, string | number>
): string {
  // Ensure valid language, fallback to English
  const lang = (language === 'zh-CN' || language === 'en') ? language : 'en'

  // Get message object for corresponding language
  const langMessages = messages[lang as keyof typeof messages] as MessageSchema

  // Parse nested key path like 'errors.fileNotFound'
  const keys = key.split('.')
  let value: any = langMessages

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // If key doesn't exist, try to fallback to English
      if (lang !== 'en') {
        return t(key, 'en', params)
      }
      // English also doesn't exist, return key itself as fallback
      console.warn(`Translation key not found: ${key} for language: ${lang}`)
      return key
    }
  }

  // If final value is not a string, return key
  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string for key: ${key}`)
    return key
  }

  // Support simple parameter interpolation: {paramName}
  let result = value
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      const placeholder = `{${paramKey}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(paramValue))
    })
  }

  return result
}

/**
 * Convenience function for getting error messages
 *
 * @param errorKey - Error key, will automatically add 'errors.' prefix
 * @param language - Target language
 * @param params - Optional parameters
 * @returns Translated error message
 *
 * @example
 * getErrorMessage('fileNotFound', 'zh-CN') // Equivalent to t('errors.fileNotFound', 'zh-CN')
 */
export function getErrorMessage(
  errorKey: string,
  language: string = 'en',
  params?: Record<string, string | number>
): string {
  return t(`errors.${errorKey}`, language, params)
}

/**
 * Convenience function for getting success messages
 *
 * @param messageKey - Message key, will automatically add 'messages.' prefix
 * @param language - Target language
 * @param params - Optional parameters
 * @returns Translated success message
 */
export function getSuccessMessage(
  messageKey: string,
  language: string = 'en',
  params?: Record<string, string | number>
): string {
  return t(`messages.${messageKey}`, language, params)
}

/**
 * Convenience function for getting validation messages
 *
 * @param validationKey - Validation key, will automatically add 'validation.' prefix
 * @param language - Target language
 * @param params - Optional parameters
 * @returns Translated validation message
 */
export function getValidationMessage(
  validationKey: string,
  language: string = 'en',
  params?: Record<string, string | number>
): string {
  return t(`validation.${validationKey}`, language, params)
}
