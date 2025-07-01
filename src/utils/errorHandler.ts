/**
 * 轻量级错误处理
 * 一个函数搞定所有错误处理，保持简洁
 */

/**
 * 统一错误处理函数
 * @param error 任何类型的错误对象
 * @returns 用户友好的错误信息
 */
export function handleError(error: any): string {
  // 网络连接失败
  if (!error.response) {
    return '网络连接失败，请检查网络连接'
  }

  // HTTP状态码错误
  const status = error.response.status

  // 身份验证相关错误
  if (status === 401 || status === 403) {
    return '访问被拒绝，请检查密码或权限'
  }

  // 文件大小超限
  if (status === 413) {
    return '文件太大，请选择较小的文件'
  }

  // 请求超时
  if (status === 408) {
    return '请求超时，请重试'
  }

  // 服务器错误
  if (status >= 500) {
    return '服务器错误，请稍后重试'
  }

  // 用户取消操作
  if (error.name === 'AbortError') {
    return '操作已取消'
  }

  // 返回服务器提供的错误信息，或默认消息
  return error.response?.data?.msg ||
         error.response?.data?.message ||
         error.message ||
         '操作失败，请重试'
}
