/**
 * Cloudflare Workers 主入口文件
 * 处理HTTP请求和定时任务
 * @module worker/index
 */

import { AutoRouter, error } from 'itty-router'
import { newResponse } from './utils/response'
import { word_router as word_data, view_router as view_data } from './api/data'
import { word_router as word_file, view_router as view_file } from './api/file'
import { word_router as word_config, view_router as view_config } from './api/config'
import { word_router as word_auth, view_router as view_auth } from './api/auth'
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
router.all('/v/:view_word/api/auth/*', view_auth.fetch) // 认证授权路由
router.all('/:word/api/auth/*', word_auth.fetch) // 认证授权路由
router.all('/v/:view_word/api/config/*', view_config.fetch) // 配置信息路由
router.all('/:word/api/config/*', word_config.fetch) // 配置信息路由
// 404处理
router.all('/*', () => error(404, 'Resource Not Found'))

export default {
  /**
   * HTTP请求处理器
   */
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    console.log(`fetch [${req.method}]${req.url}`)
    const url = new URL(req.url)
    // 匹配 /:word/api/和/v/:view_word/api/开头的请求
    const apiRegex = /^\/([a-zA-Z0-9_]+|v\/[a-zA-Z0-9_]+)\/api\//
    if (apiRegex.test(url.pathname)) {
      return router.fetch(req, env, ctx).catch((err: any) => {
        console.log('api execute error', err)
        return newResponse({ code: 500, msg: 'api execute error' })
      })
    }

    return env.ASSETS.fetch(req)
  },

  /**
   * 定时任务处理器
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return schedule(controller, env, ctx)
  },
}
