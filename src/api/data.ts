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
  getKeyword() {
    return request.get<Keyword>('/data').then((data) => {
      Utils.cookies2LocalStorage()
      return data
    })
  },

  /**
   * 创建新的word
   */
  createKeyword(data: Keyword) {
    return request.post<number>('/data', data)
  },

  /**
   * 更新word信息
   */
  updateKeyword(data: Partial<Keyword>) {
    return request.put<number>('/data', data)
  },

  /**
   * 删除word
   */
  deleteKeyword() {
    return request.delete<number>('/data').then((data) => {
      Utils.clearLocalStorageAndCookies()
      return data
    })
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
      Utils.cookies2LocalStorage()
      return data
    })
  },
}
