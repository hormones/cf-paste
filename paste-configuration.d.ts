/**
 * 全局类型定义文件
 * @module paste-configuration
 */
import { IRequestStrict } from 'itty-router'

/**
 * API响应数据结构
 */
declare global {
  interface ApiResponse<T = never> {
    /** 状态码 */
    code?: number
    /** 响应数据 */
    data?: T | null
    /** 响应消息 */
    msg?: string
  }

  interface Keyword {
    /** 主键ID */
    id: number
    /** 关键词 */
    word: string
    /** 剪贴板内容，最后会放到R2的word文件夹下，文件名为index.txt，不会存入到D1数据库中 */
    content: string
    /** 密码 */
    password?: string
    /** 过期时间 */
    expire_time: number
    /** 用户选择的过期时长（秒），默认3天 */
    expire_value?: number
    /** 创建时间 */
    create_time: number
    /** 更新时间 */
    update_time: number
    /** 随机密钥 */
    view_word: string
    /** 最后访问时间 */
    last_view_time: number
    /** 访问次数 */
    view_count: number
  }

  type KeywordDB = Omit<Keyword, 'content'>

  /** 数据库查询操作符 */
  type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN'

  /** 查询条件结构 */
  type WhereCondition = {
    /** 字段名 */
    key: string
    /** 字段值 */
    value: string | number | Array<string | number>
    /** 操作符，默认为 = */
    operator?: Operator
  }

  type IContext = {
    /** 请求唯一标识 */
    id: string
    /** 关键词 */
    word: string
    /** 发起时间 */
    startTime: number
  }

  type IRequest = {
    /** 函数路径 */
    functionPath: string
    /** 请求位置 */
    location: string
    /** 编辑模式，0表示浏览模式，1表示编辑模式 */
    edit: number
    /** 授权信息 */
    authorization: string
    /** 时间戳 */
    timestamp: number
  } & IContext & IRequestStrict
}

/// <reference types="itty-router" />
