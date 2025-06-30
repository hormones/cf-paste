import { RequestHandler, ResponseHandler, error } from 'itty-router'
import { D1 } from './bindings/d1'
import { Auth } from './utils/auth'
import { Utils } from './utils'
import { deleteKeyword, getKeyword } from './api/data'

export const prepare: RequestHandler<IRequest> = async (
  req: IRequest,
  env: Env,
  ctx: ExecutionContext
) => {
  // 设置请求上下文
  req.id = Utils.generateId('uuid')
  req.startTime = Date.now()
  req.functionPath = new URL(req.url).pathname
  req.location = `${(req as any).cf?.city}-${(req as any).cf?.country}`
}

// MIDDLEWARE: withAuthenticatedUser - embeds user in Request or returns a 401
export const authenticate: RequestHandler<IRequest> = async (
  req: IRequest,
  env: Env,
  ctx: ExecutionContext
) => {
  // authorization规则：Basic crypt(word:timestamp)
  const now = Date.now()
  const c_word = Auth.getCookie(req, 'word')
  const c_view_word = Auth.getCookie(req, 'view_word')
  let c_authorization = Auth.getCookie(req, 'authorization')

  console.log('authentication start', c_word, c_view_word, c_authorization)

  // cookie中c_word和c_view_word二者必有其一
  if (!c_word && !c_view_word) {
    console.error('c_word和c_view_word都为空')
    return error(400, '访问出错了，请刷新页面')
  }

  req.edit = c_word ? 1 : 0

  let keyword: Keyword | null = await getKeyword(env, req, c_word, c_view_word)
  if (!c_word && c_view_word && !keyword) {
    console.error(`通过${c_view_word}找不到对应的keyword信息`)
    return error(404, '访问出错了，页面不存在')
  }

  req.word = c_word || keyword!.word

  // word已经过期，删除word
  if (keyword && keyword.expire_time && keyword.expire_time <= now) {
    req.clearAuthCookie = true
    await deleteKeyword(req, env)
    keyword = null
    c_authorization = null
    return error(410, '访问出错了，数据已被删除')
  }

  // 如果请求地址是verify，则放行此接口以进行密码验证
  if (req.url.endsWith('/api/data/verify')) {
    return
  }

  // 不存在authorization时，如果word无密码，则需要生成authorization
  if (!c_authorization) {
    // 存在密码，返回403
    if (keyword?.password) {
      return error(401, '需要验证身份')
    }

    req.authorization = await Auth.encrypt(env, `${req.word}:${Date.now()}`)
    return
  }

  // 存在authorization，验证authorization
  try {
    const a_authorization = await Auth.decrypt(env, c_authorization!)
    console.log('a_authorization', a_authorization)

    const [a_word, a_timestamp] = a_authorization.split(':')
    const timestamp = parseInt(a_timestamp)

    if ((c_word && c_word !== a_word) || (!c_word && keyword!.word !== a_word)) {
      req.clearAuthCookie = true
      console.error('密钥不匹配')
      return error(403, '拒绝访问')
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
  } catch (err) {
    req.clearAuthCookie = true
    console.error('解密失败', err)
    return error(403, '拒绝访问')
  }
  console.log('authentication success')
}

export const handle = (res: Response, req: IRequest) => {
  if (req.authorization) {
    console.log('set cookie', req.authorization)
    Auth.setCookie(res, 'authorization', req.authorization)
  } else if (req.clearAuthCookie) {
    console.log('clear cookie')
    Auth.clearCookie(res, 'authorization')
  }
  if (res.status !== 200) {
    console.error(`response error, url=${req.functionPath}, status=${res.status}`)
  }
  console.log(req.url, 'served in', Date.now() - req.startTime, 'ms')
}
