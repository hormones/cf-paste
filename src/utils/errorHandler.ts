/**
 * Lightweight error handling
 * One function handles all error processing, keeping it simple
 *
 * Note: 由于这是工具函数，不使用组合函数，而是返回错误key，由调用方处理国际化
 */

/**
 * 错误代码映射
 */
const ERROR_CODES = {
  NETWORK: 'errors.network',
  AUTH_FAILED: 'errors.accessDeniedWithPassword',
  FILE_TOO_LARGE: 'errors.fileTooLarge',
  REQUEST_TIMEOUT: 'errors.requestTimeout',
  SERVER_ERROR: 'errors.server',
  OPERATION_CANCELLED: 'errors.operationCancelled',
  OPERATION_FAILED: 'errors.operationFailed'
}

/**
 * Unified error handling function
 * @param error Any type of error object
 * @returns Error key for i18n or original error message
 */
export function handleError(error: any): string {
  // Network connection failure
  if (!error.response) {
    return ERROR_CODES.NETWORK
  }

  // HTTP status code errors
  const status = error.response.status

  // Authentication related errors
  if (status === 401 || status === 403) {
    return ERROR_CODES.AUTH_FAILED
  }

  // File size exceeded
  if (status === 413) {
    return ERROR_CODES.FILE_TOO_LARGE
  }

  // Request timeout
  if (status === 408) {
    return ERROR_CODES.REQUEST_TIMEOUT
  }

  // Server errors
  if (status >= 500) {
    return ERROR_CODES.SERVER_ERROR
  }

  // User cancelled operation
  if (error.name === 'AbortError') {
    return ERROR_CODES.OPERATION_CANCELLED
  }

  // Return server-provided error message, or default error key
  return error.response?.data?.msg ||
         error.response?.data?.message ||
         error.message ||
         ERROR_CODES.OPERATION_FAILED
}
