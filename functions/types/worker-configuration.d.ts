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
  /** 剪切板内容，最后会放到R2的word文件夹下，文件名为index.txt，不会存入到D1数据库中 */
  content: string
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

type KeywordDB = Exclude<keyof Keyword, 'content'>

/** 数据库查询操作符 */
type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN'

/** 查询条件结构 */
type WhereCondition<K> = {
  /** 字段名 */
  key: K
  /** 字段值 */
  value: string | number | Array<string | number>
  /** 操作符，默认为 = */
  operator?: Operator
}
