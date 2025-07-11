import { AutoRouter, error } from 'itty-router'
import { newResponse } from './utils/response'
import { word_router as word_data, view_router as view_data } from './api/data'
import { word_router as word_file, view_router as view_file } from './api/file'
import { word_router as word_pass, view_router as view_pass } from './api/pass'
import { prepare, authenticate, handle } from './authentication'
import schedule from './schedule'

const router = AutoRouter({
  before: [prepare, authenticate],
  finally: [handle],
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

const executeRouter = (req: IRequest, env: Env, ctx: ExecutionContext) => {
  console.log('route request', req.url)
  return router.fetch(req, env, ctx).catch((err: any) => {
    console.log('api execute error', err)
    console.error('API execution error:', {
      path: req.url,
      method: req.method,
      error: err.message,
      timestamp: new Date().toISOString(),
    })
    return newResponse({ code: 500, msg: req.t('errors.systemError') }, req.language)
  })
}

export default {
  async fetch(req: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname

    // Match /api/:word/api/ requests
    const wordMatch = path.match(/^\/api\/([a-zA-Z0-9_]+)\//)
    if (wordMatch) {
      // Paths starting with /v/ should be caught by viewMatch, if matched here as /v/api/ then the path is invalid
      if (wordMatch[1] === 'v') {
        return env.ASSETS.fetch(req)
      }
      req.word = wordMatch[1] || ''
      req.view_word = ''
      req.edit = 1
      return executeRouter(req, env, ctx)
    }

    // Match /api/v/:view_word/ requests
    const viewMatch = path.match(/^\/api\/v\/([a-zA-Z0-9_]+)\//)
    if (viewMatch) {
      req.word = ''
      req.view_word = viewMatch[1] || ''
      req.edit = 0
      return executeRouter(req, env, ctx)
    }

    // If no API path matches, serve static assets
    console.log('route static', req.url)
    return env.ASSETS.fetch(req)
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return schedule(controller, env, ctx)
  },
}
