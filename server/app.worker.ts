import { createRequest, createContext, createResponse } from './platforms/cloudflare'
import { registerRoutes } from './router/routes'
import { router } from './router'

registerRoutes()

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    if (path.startsWith('/api/')) {
      console.log('route request', path)
      try {
        const req = createRequest(request, env)
        const context = createContext(env)

        const apiResponse = await router.dispatch(req, context)
        const response = createResponse(apiResponse)

        if (req.clearCookie4auth) {
          response.headers.append('Set-Cookie', 'authorization=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax')
        }

        if (req.cookie4language) {
          response.headers.append('Set-Cookie', `language=${req.cookie4language}; Path=/; Max-Age=31536000; SameSite=Lax`)
        }

        return response
      } catch (error) {
        console.error('API execution error:', error)
        return createResponse({
          code: 500,
          msg: 'System error',
          status: 500
        })
      }
    }

    console.log('route static', path)
    return env.ASSETS.fetch(request)
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const context = createContext(env)
    await runScheduledTasks(context)
  }
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
