import { detectLanguage, type Locale } from '../../shared/i18n'
import { messages } from '../../shared/locales'

export function t(language: string, key: string, params?: Record<string, string | number>): string {
  const locale = (language as Locale) || 'en'
  const message = getNestedValue(messages[locale as keyof typeof messages] || messages.en, key)

  if (!message) {
    console.warn(`Translation key not found: ${key} for locale: ${locale}`)
    return key
  }

  if (params) {
    return replaceParams(message, params)
  }

  return message
}

export function detectLanguageFromRequest(
  envLanguage?: string,
  acceptLanguage?: string,
  country?: string
): Locale {
  return detectLanguage(envLanguage, acceptLanguage, country)
}

function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return undefined
    }
  }

  return typeof current === 'string' ? current : undefined
}

function replaceParams(message: string, params: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() || match
  })
}
