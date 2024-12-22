/**
 * 数据相关API
 */
import { request } from './request'
import type { Keyword } from '@/types'

export const dataApi = {
  /**
   * 获取word详情
   */
  getKeyword() {
    return request.get<Keyword>('/data')
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
    return request.delete<number>('/data')
  },
}
