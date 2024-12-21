import { AutoRouter } from 'itty-router'
import { newErrorResponse } from '../utils/response'
import data from './data'
import file from './file'

const router = AutoRouter()
// 构建子路由
router.all('/api/data/*', data.fetch)
router.all('/api/file/*', file.fetch)
// 默认路由
router.all('/api/*', () => new Response('Resource Not Found', { status: 404 }))

export const onRequest = async (context) => {
  try {
    // console.log('context', context)
    context.env.requestId = crypto.randomUUID() // 生成本次请求唯一ID
    context.env.method = context.request.method
    context.env.functionPath = context.functionPath
    context.env.location = `${context.request?.cf?.city}-${context.request?.cf?.country}`
    return router.fetch(context.request, context.env)
  } catch (error) {
    console.error('Function request error', error)
    return newErrorResponse(error)
  }
}
