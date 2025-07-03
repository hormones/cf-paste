import { RequestHandler, ResponseHandler, error } from 'itty-router'
import { Auth } from './utils/auth'
import { deleteKeyword, getKeyword } from './api/data'

export const prepare: RequestHandler<IRequest> = async (
  req: IRequest,
  _env: Env,
  _ctx: ExecutionContext
) => {
  req.ip = req.headers.get('cf-connecting-ip') || 'unknown'
  req.startTime = Date.now()
  req.functionPath = new URL(req.url).pathname
  req.location = `${(req as any).cf?.city}-${(req as any).cf?.country}`
  // 从url中获取word和view_word
  const url = new URL(req.url)
  const wordMatch = url.pathname.match(/^\/([a-zA-Z0-9_]+)\/api\//)
  const viewWordMatch = url.pathname.match(/^\/v\/([a-zA-Z0-9_]+)\/api\//)
  if (wordMatch) {
    req.word = wordMatch[1]
  }
  if (viewWordMatch) {
    req.view_word = viewWordMatch[1]
  }
  req.edit = req.word ? 1 : 0
}

// MIDDLEWARE: withAuthenticatedUser - embeds user in Request or returns a 401
export const authenticate: RequestHandler<IRequest> = async (
  req: IRequest,
  env: Env,
  _ctx: ExecutionContext
) => {
  try {
    // 如果请求地址带pass标识，则放行此接口
    if (req.url.includes('/pass/')) {
      console.log('pass request')
      return
    }

    // authorization规则：Basic crypt(word:timestamp)
    const now = Date.now()
    let c_authorization = Auth.getCookie(req, 'authorization')

    console.log('authentication start', req.word, req.view_word, c_authorization)

    // cookie中c_word和c_view_word二者必有其一
    if (!req.word && !req.view_word) {
      console.error('word和view_word都为空')
      return error(400, '访问出错了，请刷新页面')
    }

    let keyword: Keyword | null = await getKeyword(env, req, req.word, req.view_word)
    if (!req.word && req.view_word && !keyword) {
      console.error(`通过${req.view_word}找不到对应的keyword信息`)
      return error(404, '访问出错了，页面不存在')
    }

    req.word = req.word || keyword?.word || ''
    req.view_word = req.view_word || keyword?.view_word || ''

    // word已经过期，删除word
    if (keyword && keyword.expire_time && keyword.expire_time <= now) {
      req.clearAuthCookie = true
      await deleteKeyword(env, req.word)
      keyword = null
      c_authorization = null
    }

    // 如果keyword不存在，或者无密码，则不需要验证authorization
    if (!keyword || !keyword.password) {
      return
    }

    // 不存在authorization时，如果word无密码，则需要生成authorization
    if (!c_authorization) {
      return error(401, '需要验证身份')
    }

    // 存在authorization，验证authorization

    const a_authorization = await Auth.decrypt(env, c_authorization!)
    console.log('a_authorization', a_authorization)

    const [a_word, a_timestamp] = a_authorization.split(':')
    const timestamp = parseInt(a_timestamp)

    if ((req.word && req.word !== a_word) || (!req.word && keyword!.word !== a_word)) {
      req.clearAuthCookie = true
      console.error('authorization不正确')
      return error(401, '需要验证身份')
    }

    // 验证时间戳
    if (now - timestamp > 7 * 24 * 60 * 60 * 1000) {
      req.clearAuthCookie = true
      return error(401, '密钥已过期')
    }

    // 如果浏览模式，不允许访问PUT/POST/DELETE请求
    if (!req.edit) {
      if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') {
        console.error('浏览模式非法调用')
        return error(403, '拒绝访问')
      }
    }
    console.log('authentication success')
  } catch (err) {
    req.clearAuthCookie = true
    console.error('authorization failed', err)
    return error(500, 'authorization failed')
  }
}

export const handle = (res: Response, req: IRequest) => {
  if (req.authorization) {
    const path = req.edit ? `/${req.word}` : `/v/${req.view_word}`
    console.log('set cookie', path, req.authorization)
    Auth.setCookie(res, 'authorization', req.authorization, { path })
  } else if (req.clearAuthCookie) {
    console.log('clear cookie')
    Auth.clearCookie(res, 'authorization')
  }
  if (res.status !== 200) {
    console.error(`response error, url=${req.functionPath}, status=${res.status}`)
  }
  console.log(req.url, 'served in', Date.now() - req.startTime, 'ms')
}
