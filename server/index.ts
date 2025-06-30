/**
 * Cloudflare Workers 主入口文件
 * 处理HTTP请求和定时任务
 * @module worker/index
 */

import { AutoRouter, error } from 'itty-router'
import { newResponse } from './utils/response'
import data from './api/data'
import file from './api/file'
import config from './api/config'
import { prepare, authenticate, handle } from './authentication'
import schedule from './schedule'

const router = AutoRouter({
  before: [prepare, authenticate],
  finally: [handle],
})

// 注册API路由
router.all('/api/data/*', data.fetch) // 数据操作路由
router.all('/api/file/*', file.fetch) // 文件操作路由 (包含分片上传)
router.all('/api/config/*', config.fetch) // 配置信息路由
// 404处理
router.all('/*', () => error(404, 'Resource Not Found'))

export default {
  /**
   * HTTP请求处理器
   */
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    console.log('req.url', req.url)
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api')) {
      return new Response('Not Found', { status: 404 })
    }

    return router.fetch(req, env, ctx).catch((error) => {
      console.log('api execute error', error)
      return newResponse({ code: 500, msg: 'api execute error' })
    })
  },

  /**
   * 定时任务处理器
   */
  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    return schedule(controller, env, _ctx)
  },
}
