import { IRequestStrict } from 'itty-router'

export type KeywordDB = Omit<Keyword, 'content'>

export type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN'

export type WhereCondition = {
  key: string
  value: string | number | Array<string | number>
  operator?: Operator
}

export type IContext = {
  word: string
  view_word: string
  startTime: number
  language: string
  t: (key: string, params?: Record<string, string | number>) => string
}

export type IRequest = {
  ip: string
  location: string
  edit: number
  cookie4auth?: string
  clearCookie4auth?: boolean
  cookie4language?: string
} & IContext &
  IRequestStrict

/// <reference types="itty-router" />
