/**
 * API路由入口文件
 * 处理所有 /api/* 路径的请求，并分发到对应的子路由处理器
 * @module api/route
 */

import { AutoRouter } from 'itty-router'
import { newErrorResponse } from '../utils/response'
import data from './data'
import file from './file'

const router = AutoRouter()

// /**
//  * 全局前置中间件：检查word参数
//  * 所有API请求都需要提供有效的word参数
//  */
// router.all('*', (request, env) => {
//   if (!env.word) {
//     return error(401, 'invalid request')
//   }
// })

// 子路由注册
router.all('/api/data/*', data.fetch) // 数据操作路由
router.all('/api/file/*', file.fetch) // 文件操作路由
router.all('/api/*', () => new Response('Resource Not Found', { status: 404 }))

/**
 * 请求处理入口
 * 1. 设置请求上下文（requestId, method等）
 * 2. 路由分发
 * 3. 错误处理
 */
export const onRequest = async (context) => {
  try {
    // 设置请求上下文
    context.env.requestId = crypto.randomUUID()
    context.env.method = context.request.method
    context.env.functionPath = context.functionPath
    context.env.location = `${context.request?.cf?.city}-${context.request?.cf?.country}`
    return router.fetch(context.request, context.env)
  } catch (error) {
    return newErrorResponse(context.env, { error })
  }
}
