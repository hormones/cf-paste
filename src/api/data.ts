/**
 * 数据相关API
 */
import { request } from './request'
import type { Keyword } from '@/types'
import { Utils } from '@/utils'

export const dataApi = {
  /**
   * 获取word详情
   */
  async getKeyword(): Promise<Keyword | null> {
    try {
      Utils.localstorage2Cookies()
      const response = await request.get('/data')
      Utils.cookies2Localstorage()
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
      Utils.localstorage2Cookies()
      const response = await request.post('/data', data)
      Utils.cookies2Localstorage()
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
      Utils.localstorage2Cookies()
      const response = await request.put('/data', data)
      Utils.cookies2Localstorage()
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
      Utils.localstorage2Cookies()
      const response = await request.delete('/data')
      Utils.cookies2Localstorage()
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
    return request.patch<number>('/data/settings', {
      expire_value: settings.expire_value,
      password: settings.password || null,
    })
  },
  /**
   * 验证密码
   * @param password 密码
   */
  verify(password: string) {
    return request.post<void>('/data/verify', { password }).then((data) => {
      Utils.cookies2Localstorage()
      return data
    })
  },
}
