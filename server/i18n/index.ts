import { messages } from '../../shared/locales'
import type { MessageSchema } from '../../shared/locales'

/**
 * 服务端轻量级翻译函数
 *
 * @param key - 翻译键，支持嵌套路径，如 'errors.fileNotFound'
 * @param language - 目标语言，默认为 'en'
 * @param params - 可选的插值参数对象
 * @returns 翻译后的文本
 *
 * @example
 * t('errors.fileNotFound', 'zh-CN') // 返回中文错误消息
 * t('messages.uploadSuccess', 'en', { filename: 'test.txt' }) // 支持参数插值
 */
export function t(
  key: string,
  language: string = 'en',
  params?: Record<string, string | number>
): string {
  // 确保语言有效，回退到英文
  const lang = (language === 'zh-CN' || language === 'en') ? language : 'en'

  // 获取对应语言的消息对象
  const langMessages = messages[lang as keyof typeof messages] as MessageSchema

  // 解析嵌套键路径，如 'errors.fileNotFound'
  const keys = key.split('.')
  let value: any = langMessages

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // 如果键不存在，尝试回退到英文
      if (lang !== 'en') {
        return t(key, 'en', params)
      }
      // 英文也没有，返回键本身作为备选
      console.warn(`Translation key not found: ${key} for language: ${lang}`)
      return key
    }
  }

  // 如果最终值不是字符串，返回键
  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string for key: ${key}`)
    return key
  }

  // 支持简单的参数插值：{paramName}
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
 * 获取错误消息的便捷函数
 *
 * @param errorKey - 错误键，会自动添加 'errors.' 前缀
 * @param language - 目标语言
 * @param params - 可选参数
 * @returns 翻译后的错误消息
 *
 * @example
 * getErrorMessage('fileNotFound', 'zh-CN') // 等同于 t('errors.fileNotFound', 'zh-CN')
 */
export function getErrorMessage(
  errorKey: string,
  language: string = 'en',
  params?: Record<string, string | number>
): string {
  return t(`errors.${errorKey}`, language, params)
}

/**
 * 获取成功消息的便捷函数
 *
 * @param messageKey - 消息键，会自动添加 'messages.' 前缀
 * @param language - 目标语言
 * @param params - 可选参数
 * @returns 翻译后的成功消息
 */
export function getSuccessMessage(
  messageKey: string,
  language: string = 'en',
  params?: Record<string, string | number>
): string {
  return t(`messages.${messageKey}`, language, params)
}

/**
 * 获取验证消息的便捷函数
 *
 * @param validationKey - 验证键，会自动添加 'validation.' 前缀
 * @param language - 目标语言
 * @param params - 可选参数
 * @returns 翻译后的验证消息
 */
export function getValidationMessage(
  validationKey: string,
  language: string = 'en',
  params?: Record<string, string | number>
): string {
  return t(`validation.${validationKey}`, language, params)
}
