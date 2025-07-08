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
}

export const authenticate: RequestHandler<IRequest> = async (
  req: IRequest,
  env: Env,
  _ctx: ExecutionContext
) => {
  try {
    // Allow pass requests without authentication
    const url = new URL(req.url)
    const urlPrefix = req.edit ? req.word : 'v/' + req.view_word
    if (url.pathname.startsWith(`/${urlPrefix}/api/pass/`)) {
      console.log('pass request', url.pathname)
      return
    }

    // Restrict view mode to GET requests only
    if (!req.edit) {
      if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') {
        console.error('Illegal call in view mode')
        return error(403, 'Access denied')
      }
    }

    // Authorization format: Basic crypt(word:timestamp)
    const now = Date.now()
    let c_authorization = Auth.getCookie(req, 'authorization')
    console.log('authentication start', req.word, req.view_word, c_authorization)

    // Get keyword information
    let keyword: Keyword | null = await getKeyword(env, req, req.word, req.view_word)
    if (!req.word && req.view_word && !keyword) {
      console.error(`Cannot find keyword info for ${req.view_word}`)
      return error(404, 'Access error, page not found')
    }

    req.word = req.word || keyword?.word || ''
    req.view_word = req.view_word || keyword?.view_word || ''

    // Delete expired keyword
    if (keyword && keyword.expire_time && keyword.expire_time <= now) {
      req.clearAuthCookie = true
      await deleteKeyword(env, req.word)
      keyword = null
      c_authorization = null
    }

    // Skip authentication if keyword doesn't exist or has no password
    if (!keyword || !keyword.password) {
      return
    }

    if (!c_authorization) {
      return error(401, 'Authentication required')
    }

    // Verify authorization
    const a_authorization = await Auth.decrypt(env, c_authorization!)
    console.log('a_authorization', a_authorization)

    const [a_word, a_timestamp] = a_authorization.split(':')
    const timestamp = parseInt(a_timestamp)

    if (req.word !== a_word) {
      req.clearAuthCookie = true
      console.error('Authorization invalid, access denied')
      return error(403, 'Access denied')
    }

    // Verify timestamp (24 hours expiry)
    if (now - timestamp > 1 * 24 * 60 * 60 * 1000) {
      req.clearAuthCookie = true
      console.error('Authorization expired, re-authentication required')
      return error(401, 'Re-authentication required')
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
