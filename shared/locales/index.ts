import enMessages from './en.json'
import zhCNMessages from './zh-CN.json'

export const availableLocales = ['en', 'zh-CN']

export type Locale = (typeof availableLocales)[number]

export const messages = {
  en: enMessages,
  'zh-CN': zhCNMessages,
}

export type MessageSchema = typeof enMessages

export { enMessages, zhCNMessages }
