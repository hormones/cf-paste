import { RequestHandler, ResponseHandler, error } from 'itty-router'
import { Auth } from './utils/auth'
import { deleteKeyword, getKeyword } from './api/data'

// 准备请求
export const prepare: RequestHandler<IRequest> = async (
  req: IRequest,
  _env: Env,
  _ctx: ExecutionContext
) => {
  req.ip = req.headers.get('cf-connecting-ip') || 'unknown'
  req.startTime = Date.now()
  req.functionPath = new URL(req.url).pathname
  req.location = `${(req as any).cf?.city}-${(req as any).cf?.country}`
}

export const authenticate: RequestHandler<IRequest> = async (
  req: IRequest,
  env: Env,
  _ctx: ExecutionContext
) => {
  try {
    // 如果浏览模式，不允许访问PUT/POST/DELETE请求
    if (!req.edit) {
      if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') {
        console.error('浏览模式非法调用')
        return error(403, '拒绝访问')
      }
    }

    // 如果请求地址带pass标识，则放行此接口
    const url = new URL(req.url)
    const urlPrefix = req.edit ? req.word : 'v/' + req.view_word
    if (url.pathname.startsWith(`/${urlPrefix}/api/pass/`)) {
      console.log('pass request', url.pathname)
      return
    }

    // authorization规则：Basic crypt(word:timestamp)
    const now = Date.now()
    let c_authorization = Auth.getCookie(req, 'authorization')
    console.log('authentication start', req.word, req.view_word, c_authorization)

    // 获取keyword信息
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

    if (!c_authorization) {
      return error(401, '需要验证身份')
    }

    // 验证authorization
    const a_authorization = await Auth.decrypt(env, c_authorization!)
    console.log('a_authorization', a_authorization)

    const [a_word, a_timestamp] = a_authorization.split(':')
    const timestamp = parseInt(a_timestamp)

    if (req.word !== a_word) {
      req.clearAuthCookie = true
      console.error('authorization异常, 拒绝访问')
      return error(403, '拒绝访问')
    }

    // 验证时间戳
    if (now - timestamp > 1 * 24 * 60 * 60 * 1000) {
      req.clearAuthCookie = true
      console.error('authorization已过期, 需要重新验证身份')
      return error(401, '需要重新验证身份')
    }
    console.log('authentication success')
  } catch (err) {
    req.clearAuthCookie = true
    console.error('authorization failed', err)
    return error(500, 'authorization failed')
  }
}

// 处理响应
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
