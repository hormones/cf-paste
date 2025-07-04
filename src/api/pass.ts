/**
 * 认证授权相关API
 */
import type { PasteConfig } from '@/types'
import { request } from './request'

export const passApi = {
  /**
   * 验证密码
   * @param password 密码
   */
  async verifyPassword(password: string): Promise<any> {
    const response = await request.post('/pass/verify', { password })
    // 成功后，后端会设置cookie，前端需要将cookie同步到localstorage
    return response
  },

  /**
   * 获取粘贴配置
   * @returns {Promise<PasteConfig>} 粘贴配置信息
   */
  getPasteConfig(): Promise<PasteConfig> {
    return request.get<PasteConfig>('/pass/config')
  },
}
