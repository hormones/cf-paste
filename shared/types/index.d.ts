import { IRequestStrict } from 'itty-router'

declare global {
  interface ApiResponse<T = never> {
    code?: number
    data?: T | null
    msg?: string | null
  }

  interface Keyword {
    id: number
    word: string
    content: string
    password?: string
    expire_time: number
    expire_value?: number
    create_time: number
    update_time: number
    view_word: string
    last_view_time: number
    view_count: number
  }

  interface Token {
    token: string
    word: string
    view_word: string
    ip_address: string
    create_time: number
    expire_time: number
  }

  type KeywordDB = Omit<Keyword, 'content'>

  type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN'

  type WhereCondition = {
    key: string
    value: string | number | Array<string | number>
    operator?: Operator
  }

  type IContext = {
    word: string
    view_word: string
    startTime: number
    language: string
    t: (key: string, params?: Record<string, string | number>) => string
  }

  type IRequest = {
    ip: string
    location: string
    edit: number
    cookie4auth?: string
    clearCookie4auth?: boolean
    cookie4language?: string
  } & IContext & IRequestStrict

  type ExpiryOption = {
    label: string
    value: number
  }
}

/// <reference types="itty-router" />
