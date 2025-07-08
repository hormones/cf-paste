import { IRequestStrict } from 'itty-router'

declare global {
  interface ApiResponse<T = never> {
    /** Status code */
    code?: number
    /** Response data */
    data?: T | null
    /** Response message */
    msg?: string
  }

  interface Keyword {
    /** Primary key ID */
    id: number
    /** Keyword */
    word: string
    /** Clipboard content - stored in R2 under word folder as index.txt, not in D1 database */
    content: string
    /** Password */
    password?: string
    /** Expiration time */
    expire_time: number
    /** User-selected expiration duration (seconds), default 3 days */
    expire_value?: number
    /** Creation time */
    create_time: number
    /** Update time */
    update_time: number
    /** Random key */
    view_word: string
    /** Last access time */
    last_view_time: number
    /** View count */
    view_count: number
  }

  interface Token {
    /** Token */
    token: string
    /** Keyword */
    word: string
    /** View password */
    view_word: string
    /** Creation IP */
    ip_address: string
    /** Creation time */
    create_time: number
    /** Expiration time */
    expire_time: number
  }

  type KeywordDB = Omit<Keyword, 'content'>

  /** Database query operators */
  type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN'

  /** Query condition structure */
  type WhereCondition = {
    /** Field name */
    key: string
    /** Field value */
    value: string | number | Array<string | number>
    /** Operator, defaults to = */
    operator?: Operator
  }

  type IContext = {
    /** Keyword */
    word: string
    /** View keyword */
    view_word: string
    /** Start time */
    startTime: number
  }

  type IRequest = {
    /** Request IP */
    ip: string
    /** Function path */
    functionPath: string
    /** Request location */
    location: string
    /** Edit mode: 0 for view mode, 1 for edit mode */
    edit: number
    /** Authorization info */
    authorization: string
    /** Clear auth cookie */
    clearAuthCookie: boolean
  } & IContext & IRequestStrict
}

/// <reference types="itty-router" />
