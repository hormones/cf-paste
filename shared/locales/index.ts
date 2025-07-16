import enMessages from './en.json'
import zhCNMessages from './zh-CN.json'

export const availableLocales = ['en', 'zh-CN'] as const

export type Locale = typeof availableLocales[number]

export const messages = {
  'en': enMessages,
  'zh-CN': zhCNMessages
} as const

export type MessageSchema = typeof enMessages

export function isValidLocale(locale: string): locale is Locale {
  return availableLocales.includes(locale as Locale)
}

export function getDefaultLocale(): Locale {
  return 'en'
}

export function getSupportedLocales(): readonly Locale[] {
  return availableLocales
}

export function getExpiryOptions(locale: Locale = 'en') {
  const timeLabels = messages[locale].common.time
  return [
    { label: timeLabels['1hour'], value: 60 * 60 },
    { label: timeLabels['1day'], value: 24 * 60 * 60 },
    { label: timeLabels['3days'], value: 3 * 24 * 60 * 60 },
    { label: timeLabels['1week'], value: 7 * 24 * 60 * 60 },
    { label: timeLabels['1month'], value: 30 * 24 * 60 * 60 },
    { label: timeLabels['3months'], value: 90 * 24 * 60 * 60 },
    { label: timeLabels['1year'], value: 365 * 24 * 60 * 60 },
    { label: timeLabels['2years'], value: 2 * 365 * 24 * 60 * 60 },
  ] as const
}

export { enMessages, zhCNMessages }
