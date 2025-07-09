import { type Locale, getDefaultLocale, getSupportedLocales } from '../locales'

export function detectLanguage(
  envLanguage?: string,
  acceptLanguage?: string,
  country?: string
): Locale {
  const supportedLocales = getSupportedLocales()
  const defaultLocale = getDefaultLocale()

  if (envLanguage && envLanguage !== 'auto' && supportedLocales.includes(envLanguage as Locale)) {
    return envLanguage as Locale
  }

  if (envLanguage === 'auto') {
    if (country) {
      const inferredLocale = inferLocaleFromCountry(country)
      if (inferredLocale) {
        return inferredLocale
      }
    }

    if (acceptLanguage) {
      const parsedLocale = parseAcceptLanguage(acceptLanguage)
      if (parsedLocale) {
        return parsedLocale
      }
    }
  }

  return defaultLocale
}

function inferLocaleFromCountry(country: string): Locale | null {
  const countryToLocale: Record<string, Locale> = {
    CN: 'zh-CN',
    TW: 'zh-CN',
    HK: 'zh-CN',
    SG: 'zh-CN',
  }

  return countryToLocale[country.toUpperCase()] || null
}

function parseAcceptLanguage(acceptLanguage: string): Locale | null {
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code] = lang.trim().split(';')
      return code.toLowerCase()
    })

  for (const lang of languages) {
    if (lang.startsWith('zh')) {
      return 'zh-CN'
    }
    if (lang.startsWith('en')) {
      return 'en'
    }
  }

  return null
}

export { type Locale, getDefaultLocale, getSupportedLocales }
