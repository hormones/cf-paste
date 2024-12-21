/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiResponse } from '../types/worker-configuration'

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

export function newErrorResponse<T>({
  error,
  msg = '',
  status = 500,
  code = status,
}: {
  error?: any
  status?: number
} & ApiResponse<T>): Response {
  msg = msg || (error && error.message) || 'function execute error'
  console.error(`request error: ${msg}`, error)
  return new Response(JSON.stringify({ code, msg }), { status })
}
