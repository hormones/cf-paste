import enMessages from './en.json'
import zhCNMessages from './zh-CN.json'

export const availableLocales = ['en', 'zh-CN'] as const

export type Locale = typeof availableLocales[number]

export const messages = {
  'en': enMessages,
  'zh-CN': zhCNMessages
} as const

export type MessageSchema = typeof enMessages

export type TranslationKey =
  | `common.buttons.${keyof typeof enMessages.common.buttons}`
  | `common.status.${keyof typeof enMessages.common.status}`
  | `common.time.expiry.${keyof typeof enMessages.common.time.expiry}`
  | `components.pageHeader.${keyof typeof enMessages.components.pageHeader}`
  | `components.pageHeader.theme.${keyof typeof enMessages.components.pageHeader.theme}`
  | `components.tabs.${keyof typeof enMessages.components.tabs}`
  | `components.settings.${keyof typeof enMessages.components.settings}`
  | `components.settings.expirationTime.${keyof typeof enMessages.components.settings.expirationTime}`
  | `components.settings.accessPassword.${keyof typeof enMessages.components.settings.accessPassword}`
  | `components.fileUpload.${keyof typeof enMessages.components.fileUpload}`
  | `components.fileTable.${keyof typeof enMessages.components.fileTable}`
  | `messages.${keyof typeof enMessages.messages}`
  | `dialogs.deleteConfirm.${keyof typeof enMessages.dialogs.deleteConfirm}`
  | `dialogs.passwordRequired.${keyof typeof enMessages.dialogs.passwordRequired}`
  | `errors.${keyof typeof enMessages.errors}`
  | `validation.${keyof typeof enMessages.validation}`

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
  const expiryLabels = messages[locale].common.time.expiry
  return [
    { label: expiryLabels['1hour'], value: 60 * 60 },
    { label: expiryLabels['1day'], value: 24 * 60 * 60 },
    { label: expiryLabels['3days'], value: 3 * 24 * 60 * 60 },
    { label: expiryLabels['1week'], value: 7 * 24 * 60 * 60 },
    { label: expiryLabels['1month'], value: 30 * 24 * 60 * 60 },
    { label: expiryLabels['3months'], value: 90 * 24 * 60 * 60 },
  ] as const
}

export { enMessages, zhCNMessages }
