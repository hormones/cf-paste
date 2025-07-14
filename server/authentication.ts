import { RequestHandler, error } from 'itty-router'
import { Auth } from './utils/auth'
import { deleteKeyword, getKeyword } from './api/data'

export const authenticate: RequestHandler<IRequest> = async (
  req: IRequest,
  env: Env,
  _ctx: ExecutionContext
) => {
  try {
    // Allow pass requests without authentication
    const url = new URL(req.url)
    const urlPrefix = req.edit ? req.word : 'v/' + req.view_word
    if (url.pathname.startsWith(`/api/${urlPrefix}/pass/`)) {
      console.log('request pass', url.pathname)
      return
    }

    // Restrict view mode to GET requests only
    if (!req.edit) {
      if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') {
        console.error('illegal call in view mode')
        return error(403, req.t('errors.accessDenied'))
      }
    }

    // Authorization format: Basic crypt(word:timestamp)
    const now = Date.now()
    let c_authorization = Auth.getCookie(req, 'authorization')
    console.log('authentication', req.word, req.view_word, c_authorization)

    // Get keyword information
    let keyword: Keyword | null = await getKeyword(req, env)
    if (!req.edit && !keyword) {
      console.error(`cannot find keyword by view_word: ${req.view_word}`)
      return error(404, req.t('errors.contentNotFound'))
    }

    req.word = req.word || keyword?.word || ''
    req.view_word = req.view_word || keyword?.view_word || ''

    // Delete expired keyword
    if (keyword && keyword.expire_time && keyword.expire_time <= now) {
      req.clearCookie4auth = true
      await deleteKeyword(env, req.word)
      keyword = null
      c_authorization = null
    }

    // Skip authentication if keyword doesn't exist or has no password
    if (!keyword || !keyword.password) {
      return
    }

    if (!c_authorization) {
      return error(401, req.t('errors.authRequired'))
    }

    // Verify authorization
    const a_authorization = await Auth.decrypt(env, c_authorization!)
    console.log('a_authorization', a_authorization)

    const [a_word, a_timestamp] = a_authorization.split(':')
    const timestamp = parseInt(a_timestamp)

    if (req.word !== a_word) {
      req.clearCookie4auth = true
      console.error('authorization invalid, access denied')
      return error(403, req.t('errors.accessDenied'))
    }

    // Verify timestamp (24 hours expiry)
    if (now - timestamp > 1 * 24 * 60 * 60 * 1000) {
      req.clearCookie4auth = true
      console.error('authorization expired, re-authentication required')
      return error(401, req.t('errors.sessionExpired'))
    }
    console.log('authentication success')
  } catch (err) {
    req.clearCookie4auth = true
    console.error('authorization failed', err)
    return error(500, req.t('errors.authorizationFailed'))
  }
}

export const postprocess = (res: Response, req: IRequest) => {
  const path = req.edit ? `/api/${req.word}` : `/api/v/${req.view_word}`
  if (req.cookie4auth) {
    console.log('set cookie4auth', req.cookie4auth)
    Auth.setCookie(res, 'authorization', req.cookie4auth, { path })
  } else if (req.clearCookie4auth) {
    console.log('clear cookie4auth')
    Auth.clearCookie(res, 'authorization')
  }

  // Set language cookie if detected for the first time
  if (req.cookie4language) {
    console.log('set cookie4language', req.cookie4language)
    Auth.setCookie(res, 'language', req.cookie4language, { path })
  }

  if (res.status !== 200) {
    console.error(`response error, status=${res.status}`)
  }
  console.log('served in', Date.now() - req.startTime, 'ms')
}
