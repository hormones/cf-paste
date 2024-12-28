/**
 * 全局中间件配置
 * 包含错误处理和认证两个中间件
 * @module middleware
 */

import { newErrorResponse, newResponse } from '../utils/response'
import { D1 } from '../bindings/d1'
import { Env, Keyword, KeywordDB } from '../types/worker-configuration'
import { Auth } from '../utils/auth'

const getKeyword = async (env: Env, c_word: string | null, c_view_word: string | null) => {
  let keyword: Keyword | null = null
  if (c_word) {
    keyword = await D1.first<KeywordDB, Keyword>(env, 'keyword', [{ key: 'word', value: c_word }])
  } else if (c_view_word) {
    keyword = await D1.first<KeywordDB, Keyword>(env, 'keyword', [
      { key: 'view_word', value: c_view_word },
    ])
  }
  return keyword
}

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
 * 认证中间件，验证请求的word和authorization参数是否有效
 */
async function authentication(context) {
  // authorization规则：Basic crypt(word:timestamp:edit) edit=1表示编辑模式，edit=0表示浏览模式
  const c_word = Auth.getCookie(context.request, 'word')
  const c_view_word = Auth.getCookie(context.request, 'view_word')
  const c_authorization = Auth.getCookie(context.request, 'authorization')
  const c_timestamp = Auth.getCookie(context.request, 'timestamp')

  console.log('authentication start', c_word, c_view_word, c_authorization, c_timestamp)

  // cookie中c_word和c_view_word二者必有其一
  if (!c_word && !c_view_word) {
    return newErrorResponse(context.env, {
      logMsg: 'c_word和c_view_word都为空',
      msg: '访问出错了，请刷新页面',
      status: 400,
    })
  }

  // 如果请求地址是/api/verify，则执行密码验证
  if (context.request.url.endsWith('/api/verify')) {
    const { password } = await context.request.json()
    const keyword: Keyword | null = await getKeyword(context.env, c_word, c_view_word)

    context.env.edit = c_word ? 1 : 0

    // 密码存在，且密码验证失败，返回403
    if (keyword?.password && keyword?.password !== password) {
      return newErrorResponse(context.env, { msg: '密码错误', status: 403 })
    }

    // 密码不存在或验证成功，设置cookie，返回200
    const response = newResponse({})
    const timestamp = Date.now().toString()
    const plain = `${keyword!.word!}:${timestamp!}:${context.env.edit}`
    const authorization = await Auth.encrypt(context.env, plain)
    Auth.setCookie(response, 'timestamp', timestamp)
    Auth.setCookie(response, 'authorization', authorization)
    return response
  }

  // 其它请求地址，不存在authorization时，如果word无密码，则需要生成authorization
  if (!c_authorization || !c_timestamp) {
    const keyword: Keyword | null = await getKeyword(context.env, c_word, c_view_word)
    if (!c_word && c_view_word && !keyword) {
      return newErrorResponse(context.env, {
        logMsg: `通过${c_view_word}找不到对应的keyword信息`,
        msg: '访问出错了，页面不存在',
        status: 404,
      })
    }

    // 存在密码，返回403
    if (keyword?.password) {
      return newErrorResponse(context.env, { msg: '需要验证身份', status: 403 })
    }

    context.env.word = c_word || keyword!.word
    context.env.edit = c_word ? 1 : 0 // 设置编辑模式

    const response = await context.next()
    const timestamp = Date.now().toString()
    const plain = `${context.env.word}:${timestamp}:${context.env.edit}`
    const authorization = await Auth.encrypt(context.env, plain)
    Auth.setCookie(response, 'timestamp', timestamp)
    Auth.setCookie(response, 'authorization', authorization)
    return response
  }

  // 其它请求地址，存在authorization且word有密码，验证authorization
  try {
    const a_authorization = await Auth.decrypt(context.env, c_authorization)
    const [a_word, a_timestamp, a_edit] = a_authorization.split(':')

    console.log('a_authorization', a_authorization)

    const timestamp = parseInt(a_timestamp)
    if ((c_word && c_word !== a_word) || a_timestamp !== c_timestamp) {
      throw new Error('拒绝访问')
    }
    // 验证时间戳
    const now = Date.now()
    if (timestamp > now || now - timestamp > 7 * 24 * 60 * 60 * 1000) {
      throw new Error('拒绝访问')
    }

    context.env.word = a_word
    context.env.edit = parseInt(a_edit)

    // 如果浏览模式，不允许访问PUT/POST/DELETE请求
    if (!context.env.edit) {
      if (
        context.request.method === 'PUT' ||
        context.request.method === 'POST' ||
        context.request.method === 'DELETE'
      ) {
        return newErrorResponse(context.env, {
          logMsg: '浏览模式非法调用',
          msg: '拒绝访问',
          status: 403,
        })
      }
    }
  } catch (error) {
    const response = newErrorResponse(context.env, {
      error,
      msg: error.message || '拒绝访问',
      status: 403,
    })
    // 解密失败，清除cookie
    Auth.clearCookie(response, 'timestamp', 'authorization')
    return response
  }
  console.log('authentication success')
  return context.next()
}

export const onRequest = [errorHandling, authentication]
