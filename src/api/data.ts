/**
 * 数据相关API
 */
import { request } from './request'
import type { Keyword } from '@/types'

export const dataApi = {
  /**
   * 获取关键词详情
   */
  getKeyword() {
    return request.get<Keyword>('/data')
  },

  /**
   * 创建新的关键词
   */
  createKeyword(data: Partial<Keyword>) {
    return request.post<number>('/data', data)
  },

  /**
   * 更新关键词信息
   */
  updateKeyword(data: Partial<Keyword>) {
    return request.put<number>('/data', data)
  },

  /**
   * 删除关键词
   */
  deleteKeyword() {
    return request.delete<number>('/data')
  },
}
