/**
 * 数据相关API
 */
import { request } from './request'
import type { Keyword } from '@/types'

export const dataApi = {
  /**
   * 获取word详情
   */
  async getKeyword(): Promise<Keyword | null> {
    try {
      const response = await request.get('/data')
      return response
    } catch (error) {
      console.error('获取关键词失败:', error)
      throw error
    }
  },

  /**
   * 创建新的word
   */
  async createKeyword(data: Keyword): Promise<number> {
    try {
      const response = await request.post('/data', data)
      return response
    } catch (error) {
      console.error('创建关键词失败:', error)
      throw error
    }
  },

  /**
   * 更新word信息
   */
  async updateKeyword(data: Partial<Keyword>): Promise<void> {
    try {
      const response = await request.put('/data', data)
      return response
    } catch (error) {
      console.error('更新关键词失败:', error)
      throw error
    }
  },

  /**
   * 删除word
   */
  async deleteKeyword(): Promise<void> {
    try {
      const response = await request.delete('/data')
      return response
    } catch (error) {
      console.error('删除关键词失败:', error)
      throw error
    }
  },

  /**
   * 保存设置（过期时间和密码）
   */
  saveSettings(settings: { expire_value: number; password?: string }) {
    return request.patch<{ message: string; view_word?: string }>('/data/settings', {
      expire_value: settings.expire_value,
      password: settings.password || null,
    })
  },

  /**
   * 重置只读链接
   */
  resetViewWord() {
    return request.patch<{ view_word: string }>('/data/view-word')
  },
}
