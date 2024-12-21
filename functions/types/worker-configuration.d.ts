/**
 * 全局类型定义文件
 * @module types/worker-configuration
 */

import { D1Database, R2Bucket } from '@cloudflare/workers-types/experimental'

/**
 * Cloudflare Workers环境变量
 */
export interface Env {
  /** D1数据库实例 */
  DB: D1Database
  /** R2存储桶实例 */
  BUCKET: R2Bucket
  /** 请求唯一标识 */
  requestId: string
  /** 请求方法 */
  method: string
  /** 函数路径 */
  functionPath: string
  /** 请求位置 */
  location: string
  /** 关键词 */
  word: string
}

/**
 * API响应数据结构
 */
interface ApiResponse<T = never> {
  /** 状态码 */
  code?: number
  /** 响应数据 */
  data?: T | null
  /** 响应消息 */
  msg?: string
}

/**
 * 关键词数据结构
 */
export interface Keyword {
  /** 主键ID */
  id: number
  /** 关键词 */
  word: string
  /** 密码 */
  password?: string
  /** 过期时间 */
  expire_time: string
  /** 创建时间 */
  create_time: string
  /** 更新时间 */
  update_time: string
  /** 随机密钥 */
  random_key: string
  /** 最后访问时间 */
  last_view_time: string
  /** 访问次数 */
  view_count: number
}
