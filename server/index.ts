import { AutoRouter, error } from 'itty-router'
import { newResponse } from './utils/response'
import { word_router as word_data, view_router as view_data } from './api/data'
import { word_router as word_file, view_router as view_file } from './api/file'
import { word_router as word_pass, view_router as view_pass } from './api/pass'
import { prepare, authenticate, handle } from './authentication'
import schedule from './schedule'
import { t } from './i18n'

const router = AutoRouter({
  before: [prepare, authenticate],
  finally: [handle],
})

// Register API routes
router.all('/v/:view_word/api/data/*', view_data.fetch) // Data operation routes
router.all('/:word/api/data/*', word_data.fetch) // Data operation routes
router.all('/v/:view_word/api/file/*', view_file.fetch) // File operation routes (including multipart upload)
router.all('/:word/api/file/*', word_file.fetch) // File operation routes (including multipart upload)
router.all('/v/:view_word/api/pass/*', view_pass.fetch) // Authentication routes
router.all('/:word/api/pass/*', word_pass.fetch) // Authentication routes
// 404 handler
router.all('/*', (req: IRequest) => error(404, t('errors.resourceNotFound', req.language)))

export default {
  async fetch(req: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    console.log(`fetch [${req.method}]${req.url}`)
    const url = new URL(req.url)
    const path = url.pathname

    const executeRouter = () =>
      router.fetch(req, env, ctx).catch((err: any) => {
        console.log('api execute error', err)
        return newResponse({ code: 500, msg: 'api execute error' })
      })

    // Match /:word/api/ requests
    const wordMatch = path.match(/^\/([a-zA-Z0-9_]+)\/api\//)
    if (wordMatch) {
      // Paths starting with /v/ should be caught by viewMatch, if matched here as /v/api/ then the path is invalid
      if (wordMatch[1] === 'v') {
        return env.ASSETS.fetch(req)
      }
      req.word = wordMatch[1] || ''
      req.view_word = ''
      req.edit = 1
      return executeRouter()
    }

    // Match /v/:view_word/api/ requests
    const viewMatch = path.match(/^\/v\/([a-zA-Z0-9_]+)\/api\//)
    if (viewMatch) {
      req.word = ''
      req.view_word = viewMatch[1] || ''
      req.edit = 0
      return executeRouter()
    }

    // If no API path matches, serve static assets
    return env.ASSETS.fetch(req)
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return schedule(controller, env, ctx)
  },
}
