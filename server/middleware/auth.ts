import { IRequest, IContext, ApiResponse, Middleware, Keyword } from '../types'
import { Auth } from '../utils/auth'

export const authMiddleware: Middleware = async (req: IRequest, ctx: IContext, next) => {
  try {
    const urlPrefix = req.edit ? req.word : 'v/' + req.view_word
    if (req.path.startsWith(`/api/${urlPrefix}/pass/`)) {
      console.log('request pass', req.path)
      return await next()
    }

    if (!req.edit) {
      if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') {
        console.error('illegal call in view mode')
        return {
          code: 403,
          msg: req.t('errors.accessDenied'),
          status: 403
        }
      }
    }

    const now = Date.now()
    let c_authorization = getCookie(req, 'authorization') || ''
    console.log('authentication', req.edit, req.word, req.view_word, c_authorization)

    let keyword: Keyword | null = await getKeyword(req, ctx)
    if (!req.edit && !keyword) {
      console.error(`cannot find keyword by view_word: ${req.view_word}`)
      return {
        code: 404,
        msg: req.t('errors.contentNotFound'),
        status: 404
      }
    }

    req.word = req.word || keyword?.word || ''
    req.view_word = req.view_word || keyword?.view_word || ''

    if (keyword && keyword.expire_time && keyword.expire_time <= now) {
      req.clearCookie4auth = true
      await deleteKeyword(ctx, req.word)
      keyword = null
      c_authorization = ''
    }

    if (!keyword || !keyword.password) {
      return await next()
    }

    if (!c_authorization) {
      return {
        code: 401,
        msg: req.t('auth.enterPassword'),
        status: 401
      }
    }

    const a_authorization = await Auth.decrypt(ctx.config.AUTH_KEY, c_authorization)
    console.log('a_authorization', a_authorization)

    const [a_word, a_timestamp] = a_authorization.split(':')
    const timestamp = parseInt(a_timestamp)

    if (req.word !== a_word) {
      req.clearCookie4auth = true
      console.error('authorization invalid, access denied')
      return {
        code: 403,
        msg: req.t('errors.accessDenied'),
        status: 403
      }
    }

    if (now - timestamp > 1 * 24 * 60 * 60 * 1000) {
      req.clearCookie4auth = true
      console.error('authorization expired, re-authentication required')
      return {
        code: 401,
        msg: req.t('errors.sessionExpired'),
        status: 401
      }
    }
    console.log('authentication success')
    return await next()
  } catch (err) {
    req.clearCookie4auth = true
    console.error('authorization failed', err)
    return {
      code: 500,
      msg: req.t('errors.authorizationFailed'),
      status: 500
    }
  }
}

export const requireAuth: Middleware = async (req: IRequest, ctx: IContext, next) => {
  if (!req.edit) {
    return {
      code: 403,
      msg: req.t('errors.unauthorized'),
      status: 403
    }
  }

  return await next()
}

async function getKeyword(req: IRequest, ctx: IContext): Promise<Keyword | null> {
  if (req.edit) {
    return await ctx.db.first('keyword', [{ key: 'word', value: req.word }])
  } else {
    return await ctx.db.first('keyword', [{ key: 'view_word', value: req.view_word }])
  }
}

async function deleteKeyword(ctx: IContext, word: string): Promise<void> {
  await ctx.storage.delete({ prefix: word, name: 'index.txt' })
  await ctx.storage.deleteFolder({ prefix: `${word}/files` })
  await ctx.db.delete('keyword', [{ key: 'word', value: word }])
}

export const getCookie = (req: IRequest, name: string): string | null => {
  const cookies = req.getHeader('Cookie')
  if (!cookies) return null
  const cookie = cookies.split(';').find((c) => c.trim().startsWith(`${name}=`))
  return cookie ? cookie.split('=')[1] : null
}
