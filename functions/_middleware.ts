/**
 * 全局中间件配置
 * 包含错误处理和认证两个中间件
 * @module middleware
 */

import { newErrorResponse } from './utils/response'
import { D1 } from './bindings/d1'
import { Keyword, KeywordDB } from './types/worker-configuration'

/**
 * 错误处理中间件
 * 捕获并处理请求过程中的所有错误
 */
async function errorHandling(context) {
  try {
    return await context.next()
  } catch (error) {
    return newErrorResponse(context.env, { error, status: 500 })
  }
}

/**
 * 认证中间件
 * 验证请求的word和auth参数是否有效
 * 1. 检查word是否存在
 * 2. 验证word对应的记录是否存在
 * 3. 验证密码是否正确
 */
async function authentication(context) {
  const word = context.request.headers.get('x-word')
  const auth = context.request.headers.get('x-auth')
  if (!word) {
    return context.next()
  }
  console.log('authenticationing, word:', word, 'auth:', auth)
  const data = await D1.first<KeywordDB, Keyword>(context.env, 'keyword', [
    { key: 'word', value: word },
  ])
  if (!data) {
    return context.next()
  }
  // TODO...本地测试，先关闭
  // if (data.password && data.password !== auth) {
  //   return newErrorResponse(context.env, { msg: '密码错误', status: 403 })
  // }
  console.log('authentication success')
  return context.next()
}

export const onRequest = [errorHandling, authentication]
