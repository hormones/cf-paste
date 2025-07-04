/**
 * Cloudflare Workers 主入口文件
 * 处理HTTP请求和定时任务
 * @module worker/index
 */

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

// 注册API路由
router.all('/v/:view_word/api/data/*', view_data.fetch) // 数据操作路由
router.all('/:word/api/data/*', word_data.fetch) // 数据操作路由
router.all('/v/:view_word/api/file/*', view_file.fetch) // 文件操作路由 (包含分片上传)
router.all('/:word/api/file/*', word_file.fetch) // 文件操作路由 (包含分片上传)
router.all('/v/:view_word/api/pass/*', view_pass.fetch) // 无需认证授权路由
router.all('/:word/api/pass/*', word_pass.fetch) // 无需认证授权路由
// 404处理
router.all('/*', () => error(404, 'Resource Not Found'))

export default {
  /**
   * HTTP请求处理器
   */
  async fetch(req: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    console.log(`fetch [${req.method}]${req.url}`)
    const url = new URL(req.url)
    const path = url.pathname

    const executeRouter = () =>
      router.fetch(req, env, ctx).catch((err: any) => {
        console.log('api execute error', err)
        return newResponse({ code: 500, msg: 'api execute error' })
      })

    // 匹配 /:word/api/ 请求
    const wordMatch = path.match(/^\/([a-zA-Z0-9_]+)\/api\//)
    if (wordMatch) {
      // /v/开头的路径应被后续的viewMatch捕获，如果在这里匹配到 /v/api/ 则说明路径非法
      if (wordMatch[1] === 'v') {
        return env.ASSETS.fetch(req)
      }
      req.word = wordMatch[1] || ''
      req.view_word = ''
      req.edit = 1
      return executeRouter()
    }

    // 匹配 /v/:view_word/api/ 请求
    const viewMatch = path.match(/^\/v\/([a-zA-Z0-9_]+)\/api\//)
    if (viewMatch) {
      req.word = ''
      req.view_word = viewMatch[1] || ''
      req.edit = 0
      return executeRouter()
    }

    // 如果没有API路径匹配，则提供静态资源
    return env.ASSETS.fetch(req)
  },

  /**
   * 定时任务处理器
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return schedule(controller, env, ctx)
  },
}
