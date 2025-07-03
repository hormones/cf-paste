import { AutoRouter, error } from 'itty-router'
import { newResponse } from '../utils/response'
import { Auth } from '../utils/auth'
import { Utils } from '../utils'
import { getKeyword } from './data'
import { D1 } from '../bindings/d1'

const word_router = AutoRouter({ base: '/:word/api/auth' })
const view_router = AutoRouter({ base: '/v/:view_word/api/auth' })

/**
 * 验证密码
 * @route POST /api/auth/pass/verify
 * @body { password: string }
 * @returns {Promise<Response>} 验证结果
 */
word_router.post('/pass/verify', async (req: IRequest, env: Env) => request4Verify(env, req))
view_router.post('/pass/verify', async (req: IRequest, env: Env) => request4Verify(env, req))
const request4Verify = async (env: Env, req: IRequest) => {
  const u_word = req.word
  const u_view_word = req.view_word

  const { password } = (await req.json()) as { password: string }
  const keyword: Keyword | null = await getKeyword(env, req, u_word, u_view_word)

  if (!keyword) {
    console.error(`通过 ${u_word} | ${u_view_word} 找不到对应的keyword信息`)
    return error(410, '访问出错了，页面不存在')
  }
  req.word = keyword.word
  req.view_word = keyword.view_word

  // 密码存在，且密码验证失败，返回403
  if (keyword?.password) {
    const isValid = await Auth.verifyPassword(password, keyword.password, keyword.word!, env)
    if (!isValid) {
      return error(403, '密码错误')
    }
  }

  // 密码不存在或验证成功，设置cookie，返回200
  req.authorization = await Auth.encrypt(env, `${keyword!.word!}:${Date.now()}`)
  return newResponse({})
}

/**
 * 获取会话Token
 * @route GET /api/auth/token
 * @returns {Promise<Response>}
 */
word_router.get('/token', async (req: IRequest, env: Env) => request4Token(env, req))
view_router.get('/token', async (req: IRequest, env: Env) => request4Token(env, req))
const request4Token = async (env: Env, req: IRequest) => {
  // 此端点应由上游中间件(authenticate)保护
  // 仅限浏览者(viewer)使用，用于获取下载会话Token
  if (!!req.edit) {
    return error(403, 'Forbidden or not in viewer mode')
  }

  const now = Date.now()
  const ip = req.headers.get('cf-connecting-ip') || 'unknown'
  const view_word = Auth.getCookie(req, 'view_word')!

  // 1. 检查是否存在有效的、未过期的Token
  const where: WhereCondition[] = [
    { key: 'word', value: req.word! },
    { key: 'view_word', value: view_word },
    { key: 'ip_address', value: ip },
    { key: 'expire_time', value: now, operator: '>' },
  ]
  let token = await D1.first<Token>(env, 'tokens', where)

  if (token) {
    return newResponse({
      data: { token: token.token, expire_time: token.expire_time },
    })
  }

  // 2. 如果不存在，则创建新Token
  token = {
    token: Utils.generateId('long'),
    word: req.word!,
    view_word: view_word,
    ip_address: ip,
    create_time: now,
    expire_time: now + 60 * 60 * 1000, // 1 hour
  }

  await D1.insert(env, 'tokens', { ...token })

  return newResponse({ data: { token: token.token, expire_time: token.expire_time } })
}

export { word_router, view_router }
