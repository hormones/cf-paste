import { RequestHandler, ResponseHandler, error } from 'itty-router'
import { D1 } from './bindings/d1'
import { Auth } from './utils/auth'
import { Utils } from './utils'
import { getKeyword } from './api/data'

export const prepare: RequestHandler<IRequest> = async (
  req: IRequest,
  env: Env,
  ctx: ExecutionContext
) => {
  // 设置请求上下文
  req.timestamp = Date.now()
  req.id = Utils.generateId('uuid')
  req.functionPath = new URL(req.url).pathname
  req.location = `${(req as any).cf?.city}-${(req as any).cf?.country}`
}

// MIDDLEWARE: withAuthenticatedUser - embeds user in Request or returns a 401
export const authenticate: RequestHandler<IRequest> = async (
  req: IRequest,
  env: Env,
  ctx: ExecutionContext
) => {
  // authorization规则：Basic crypt(word:timestamp:edit) edit=1表示编辑模式，edit=0表示浏览模式
  const c_word = Auth.getCookie(req, 'word')
  const c_view_word = Auth.getCookie(req, 'view_word')
  const c_authorization = Auth.getCookie(req, 'authorization')
  const c_timestamp = Auth.getCookie(req, 'timestamp')

  console.log('authentication start', c_word, c_view_word, c_authorization, c_timestamp)

  // cookie中c_word和c_view_word二者必有其一
  if (!c_word && !c_view_word) {
    Utils.error(req, 'c_word和c_view_word都为空')
    return error(400, '访问出错了，请刷新页面')
  }
  req.edit = c_word ? 1 : 0

  // 如果请求地址是verify，则放行此接口以进行密码验证
  if (req.url.endsWith('/api/data/verify')) {
    return
  }

  // 其它请求地址，不存在authorization时，如果word无密码，则需要生成authorization
  if (!c_authorization || !c_timestamp) {
    const keyword: Keyword | null = await getKeyword(env, req, c_word, c_view_word)
    if (!c_word && c_view_word && !keyword) {
      Utils.error(req, `通过${c_view_word}找不到对应的keyword信息`)
      return error(404, '访问出错了，页面不存在')
    }

    // 存在密码，返回403
    if (keyword?.password) {
      return error(403, '需要验证身份')
    }

    req.word = c_word || keyword!.word
    req.edit = c_word ? 1 : 0 // 设置编辑模式

    req.timestamp = Date.now()
    req.authorization = await Auth.encrypt(env, `${req.word}:${req.timestamp!}:${req.edit}`)
    return
  }

  // 其它请求地址，存在authorization，验证authorization
  try {
    const a_authorization = await Auth.decrypt(env, c_authorization!)
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

    req.word = a_word
    req.edit = parseInt(a_edit)

    // 如果浏览模式，不允许访问PUT/POST/DELETE请求
    if (!req.edit) {
      if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') {
        Utils.error(req, '浏览模式非法调用')
        return error(403, '拒绝访问')
      }
    }
  } catch (err) {
    Utils.error(req, '解密失败', err)
    return error(403, '拒绝访问')
    // TODO...解密失败，清除cookie
    // Auth.clearCookie(response, 'timestamp', 'authorization')
  }
  console.log('authentication success')
}

export const handle = (res: Response, req: IRequest) => {
  if (req.authorization) {
    console.log('set cookie', req.authorization, req.timestamp)
    Auth.setCookie(res, 'authorization', req.authorization)
    Auth.setCookie(res, 'timestamp', req.timestamp.toString())
  }
  console.log(req.url, 'served in', Date.now() - req.startTime, 'ms')
}
