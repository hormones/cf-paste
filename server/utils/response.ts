/**
 * API响应工具函数
 * @module utils/response
 */

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
