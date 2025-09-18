import { createRequest, createContext, createResponse } from './platforms/cloudflare'
import { registerRoutes } from './router/routes'
import { router } from './router'
import { Utils } from './utils'

registerRoutes()

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    console.log('route request', request.url)
    try {
      const context = createContext(env)
      const req = createRequest(request, env, context)

      const apiResponse = await router.dispatch(req, context)
      const response = createResponse(apiResponse)

      if (req.clearCookie4auth) {
        response.headers.append('Set-Cookie', Utils.setCookie('auth', '', req))
      }

      return response
    } catch (error) {
      console.error('API execution error:', error)
      return createResponse({
        code: 500,
        msg: 'System error',
        status: 500,
      })
    }
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const context = createContext(env)
    await runScheduledTasks(context)
  },
}

async function runScheduledTasks(ctx: any): Promise<void> {
  try {
    const expiredKeywords = await ctx.db.query(
      'SELECT word FROM keyword WHERE expire_time <= ? AND expire_time > 0',
      [Date.now()]
    )

    for (const keyword of expiredKeywords) {
      await ctx.storage.delete({ prefix: keyword.word, name: 'index.txt' })
      await ctx.storage.deleteFolder({ prefix: `${keyword.word}/files` })
      await ctx.db.delete('keyword', [{ key: 'word', value: keyword.word }])
    }

    console.log(`Cleaned up ${expiredKeywords.length} expired keywords`)
  } catch (error) {
    console.error('Scheduled task failed:', error)
  }
}
