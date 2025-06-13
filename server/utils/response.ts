/**
 * API响应工具函数
 * @module utils/response
 */

import { Utils } from './index'

/**
 * 创建成功响应
 * @param code 状态码
 * @param data 响应数据
 * @param msg 响应消息
 * @param status HTTP状态码
 */
export function newResponse<T>({
  code = 0,
  data = null,
  msg = 'success',
  status = 200,
}: {
  status?: number
} & ApiResponse<T>): Response {
  const json: ApiResponse<T> = { code, data, msg }
  return new Response(JSON.stringify(json), { status })
}

/**
 * 创建错误响应
 * @param error 错误对象
 * @param msg 错误消息
 * @param status HTTP状态码
 * @param code 业务状态码
 */
export function newErrorResponse<T>(
  context: IContext,
  {
    error,
    msg = '',
    logMsg = msg,
    status = 500,
    code = status,
  }: {
    error?: any
    status?: number
    logMsg?: string
  } & ApiResponse<T>,
): Response {
  msg = msg || (error && error.message) || 'function execute error'
  Utils.error(context, `request error: ${logMsg}`, error)
  return new Response(JSON.stringify({ code, msg }), { status })
}
