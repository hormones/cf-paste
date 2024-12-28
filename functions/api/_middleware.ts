/**
 * 全局中间件配置
 * 包含错误处理和认证两个中间件
 * @module middleware
 */

import { newErrorResponse, newResponse } from '../utils/response'
import { D1 } from '../bindings/d1'
import { Keyword, KeywordDB } from '../types/worker-configuration'
import { Auth } from '../utils/auth'

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
  // authorization规则：Basic crypt(word:timestamp)
  const c_word = Auth.getCookie(context.request, 'word')
  const c_view_word = Auth.getCookie(context.request, 'view_word')
  const c_authorization = Auth.getCookie(context.request, 'authorization')
  const c_timestamp = Auth.getCookie(context.request, 'timestamp')

  console.log('authentication start', c_word, c_view_word, c_authorization, c_timestamp)

  if (!c_word && !c_view_word) {
    return newErrorResponse(context.env, { msg: '访问出错了，请刷新页面', status: 400 })
  }

  // 如果请求地址是/api/verify，则执行密码验证
  if (context.request.url.endsWith('/api/verify')) {
    const { password } = await context.request.json()
    const keyword = await D1.first<KeywordDB, Keyword>(context.env, 'keyword', [
      { key: 'word', value: c_word! },
    ])
    if (keyword && keyword.password) {
      // 密码存在，且密码验证失败，返回403
      if (keyword.password !== password) {
        return newErrorResponse(context.env, { msg: '密码错误', status: 403 })
      }
    }
    // 密码不存在或验证成功，设置cookie，返回200
    const response = newResponse({})
    const timestamp = Date.now().toString()
    const authorization = await Auth.encrypt(context.env, `${c_word}:${timestamp}`)
    Auth.setCookie(response, 'timestamp', timestamp)
    Auth.setCookie(response, 'authorization', authorization)
    return response
  }

  // 其它请求地址，不存在authorization时，如果word无密码，则需要生成authorization
  if (!c_authorization || !c_timestamp) {
    let keyword: Keyword | null
    if (c_word) {
      keyword = await D1.first<KeywordDB, Keyword>(context.env, 'keyword', [
        { key: 'word', value: c_word! },
      ])
    } else {
      keyword = await D1.first<KeywordDB, Keyword>(context.env, 'keyword', [
        { key: 'view_word', value: c_view_word! },
      ])
      if (!keyword) {
        return newErrorResponse(context.env, { msg: '访问出错了，页面不存在', status: 403 })
      }
    }
    const password = keyword?.password || ''
    // 需要密码才能访问，则返回403
    if (password) {
      return newErrorResponse(context.env, { msg: '拒绝访问', status: 403 })
    }
    context.env.word = c_word || keyword?.word

    const response = await context.next()
    const timestamp = Date.now().toString()
    const authorization = await Auth.encrypt(context.env, `${c_word}:${timestamp}`)
    Auth.setCookie(response, 'timestamp', timestamp)
    Auth.setCookie(response, 'authorization', authorization)
    return response
  }

  // 其它请求地址，存在authorization且word有密码，验证authorization
  try {
    const decrypt = await Auth.decrypt(context.env, c_authorization)
    const a_word = decrypt.split(':')[0]
    const a_timestamp = parseInt(decrypt.split(':')[1])
    if ((c_word && c_word !== a_word) || parseInt(c_timestamp) !== a_timestamp) {
      throw new Error('拒绝访问')
    }
    // 验证时间戳
    const now = Date.now()
    if (a_timestamp > now || now - a_timestamp > 7 * 24 * 60 * 60 * 1000) {
      throw new Error('拒绝访问')
    }
    context.env.word = a_word
  } catch (error) {
    // 解密失败，清除cookie
    Auth.clearCookie(context.response, 'timestamp', 'authorization')
    return newErrorResponse(context.env, { msg: error.message || '拒绝访问', status: 403 })
  }
  console.log('authentication success')
  return context.next()
}

export const onRequest = [errorHandling, authentication]
