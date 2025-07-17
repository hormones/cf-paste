import { availableLocales, type Locale } from '../locales'

function detectLanguage(
  envLanguage?: string,
  acceptLanguage?: string,
  country?: string
): Locale {
  console.log('envLanguage|acceptLanguage|country: ', envLanguage, acceptLanguage, country)
  const defaultLocale = getDefaultLocale()

  if (envLanguage && envLanguage !== 'auto' && isValidLocale(envLanguage)) {
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

function isValidLocale(locale: string): locale is Locale {
  return availableLocales.includes(locale as Locale)
}

function getDefaultLocale(): Locale {
  return 'en'
}

export { type Locale, detectLanguage, isValidLocale, getDefaultLocale }
