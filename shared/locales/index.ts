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
    { label: timeLabels['1h'], value: 60 * 60 },
    { label: timeLabels['1d'], value: 24 * 60 * 60 },
    { label: timeLabels['3d'], value: 3 * 24 * 60 * 60 },
    { label: timeLabels['1w'], value: 7 * 24 * 60 * 60 },
    { label: timeLabels['1m'], value: 30 * 24 * 60 * 60 },
    { label: timeLabels['3m'], value: 90 * 24 * 60 * 60 },
  ] as const
}

export { enMessages, zhCNMessages }
