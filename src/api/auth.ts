/**
 * 认证授权相关API
 */
import { request } from './request'

export const authApi = {
  /**
   * 验证密码
   * @param password 密码
   */
  async verifyPassword(password: string): Promise<any> {
    const response = await request.post('/auth/pass/verify', { password })
    // 成功后，后端会设置cookie，前端需要将cookie同步到localstorage
    return response
  },

  /**
   * 获取会话Token（用于文件下载等需要授权的操作）
   * @returns {Promise<{ token: string; expire_time: number }>}
   */
  getToken(): Promise<{ token: string; expire_time: number }> {
    return request.get('/auth/token')
  },
}
