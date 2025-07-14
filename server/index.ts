import { AutoRouter, error } from 'itty-router'
import { newResponse } from './utils/response'
import { word_router as word_data, view_router as view_data } from './api/data'
import { word_router as word_file, view_router as view_file } from './api/file'
import { word_router as word_pass, view_router as view_pass } from './api/pass'
import { authenticate, postprocess } from './authentication'
import schedule from './schedule'
import { detectLanguage } from '../shared/i18n'
import { Auth } from './utils/auth'
import { t } from './i18n'

const router = AutoRouter({
  before: [authenticate],
  finally: [postprocess],
})

// Register API routes
router.all('/api/v/:view_word/data/*', view_data.fetch) // Data operation routes
router.all('/api/:word/data/*', word_data.fetch) // Data operation routes
router.all('/api/v/:view_word/file/*', view_file.fetch) // File operation routes (including multipart upload)
router.all('/api/:word/file/*', word_file.fetch) // File operation routes (including multipart upload)
router.all('/api/v/:view_word/pass/*', view_pass.fetch) // Authentication routes
router.all('/api/:word/pass/*', word_pass.fetch) // Authentication routes
// 404 handler
router.all('/*', (req: IRequest) => error(404, req.t('errors.resourceNotFound')))

export default {
  async fetch(req: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (preprocess(req, env, ctx)) {
      console.log('route request', req.url)
      return router.fetch(req, env, ctx).catch((err: any) => {
        console.log('api execute error', err)
        console.error('API execution error:', {
          path: req.url,
          method: req.method,
          error: err.message,
          timestamp: new Date().toISOString(),
        })
        return newResponse({ code: 500, msg: req.t('errors.systemError') })
      })
    }
    console.log('route static', req.url)
    return env.ASSETS.fetch(req)
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return schedule(controller, env, ctx)
  },
}

const preprocess = (req: IRequest, env: Env, _ctx: ExecutionContext): boolean => {
  const path = new URL(req.url).pathname
  let flag = false

  // Match /api/v/:view_word
  const viewMatch = path.match(/^\/api\/v\/([a-zA-Z0-9_]+)/)
  if (viewMatch) {
    req.word = ''
    req.view_word = viewMatch[1] || ''
    req.edit = 0
    flag = true
  }

  // Match /api/:word
  const wordMatch = path.match(/^\/api\/([a-zA-Z0-9_]+)/)
  if (wordMatch) {
    req.word = wordMatch[1] || ''
    req.view_word = ''
    req.edit = 1
    flag = true
  }

  if (flag) {
    req.ip = req.headers.get('cf-connecting-ip') || 'unknown'
    req.startTime = Date.now()
    req.location = `${req.cf?.city}-${req.cf?.country}`

    // Language detection and cookie handling
    let language = Auth.getCookie(req, 'language')
    if (!language) {
      // Detect language using environment variables, CF headers, and Accept-Language
      language = detectLanguage(
        env.LANGUAGE,
        req.headers.get('Accept-Language') || undefined,
        typeof req.cf?.country === 'string' ? req.cf.country : undefined
      )

      // Set language cookie (will be handled in the response)
      req.cookie4language = language
    }

    req.language = language
    req.t = (key: string, params?: Record<string, string | number>) => t(key, req.language, params)
  }
  return flag
}
