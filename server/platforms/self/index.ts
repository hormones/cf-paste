import { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { IRequest, IContext, ApiResponse } from '../../types'
import { createSqliteAdapter } from './sqlite'
import { createLocalStorageAdapter } from './local-storage'
import { createNodeTimerAdapter } from './node-timer'
import { Utils } from '../../utils'

const extractParams = (path: string): Record<string, string> => {
  const params: Record<string, string> = {}
  const sp = path.split('?')
  if (sp.length > 1) {
    const query = sp[1]
    const queryParams = query.split('&')
    for (const param of queryParams) {
      const [key, value] = param.split('=')
      params[key] = value
    }
  }
  return params
}

export function createRequest(request: ExpressRequest): IRequest {
  // match /api/word/* or /api/v/view_word/*
  const edit = request.path.startsWith('/api/v/') ? 0 : 1
  const word = edit ? request.path.split('/')[2] : ''
  const view_word = edit ? '' : request.path.split('/')[3]
  const contentType = request.headers['content-type'] as string
  const params: Record<string, string> = {}
  if (request.query) {
    Object.entries(request.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        params[key] = value[0] as string
      } else if (typeof value === 'string') {
        params[key] = value
      } else if (value !== undefined) {
        params[key] = String(value)
      }
    })
  }

  return {
    edit,
    word,
    view_word,
    language: (request.query.language as string) || 'auto',
    t: (key: string, params?: Record<string, string | number>) => key, // TODO: implement i18n
    request: request,
    ip: request.ip || request.connection.remoteAddress || '',
    location: '', // TODO: implement location detection
    params,
    contentType: contentType || '',
    json: async () => request.body,
    text: async () =>
      typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
    method: request.method,
    path: request.url,
    getHeader: (name: string) => {
      const value = request.headers[name.toLowerCase()]
      return Array.isArray(value) ? value[0] : value || null
    },
  }
}

export function createContext(env: NodeJS.ProcessEnv): IContext {
  const dbPath = env.DB_PATH || './data/database.sqlite'
  const storagePath = env.STORAGE_PATH || './data/storage'

  return {
    platform: 'selfhost',
    config: {
      AUTH_KEY: env.AUTH_KEY || '',
      MAX_FILE_SIZE: parseInt(env.MAX_FILE_SIZE || '300'),
      MAX_TOTAL_SIZE: parseInt(env.MAX_TOTAL_SIZE || '300'),
      MAX_FILES: parseInt(env.MAX_FILES || '10'),
      CHUNK_SIZE: parseInt(env.CHUNK_SIZE || '50'),
      CHUNK_THRESHOLD: parseInt(env.CHUNK_THRESHOLD || '100'),
      LANGUAGE: env.LANGUAGE || 'auto',
    },
    platformConfig: {
      database: {
        type: 'sqlite',
        path: env.DB_PATH || './data/database.sqlite',
      },
      storage: {
        type: 'local',
        path: env.STORAGE_PATH || './data/storage',
      },
    },
    db: createSqliteAdapter(dbPath),
    storage: createLocalStorageAdapter(storagePath),
    timer: createNodeTimerAdapter(),
  }
}

export function createResponse(response: ApiResponse): ExpressResponse {
  const res = response as any

  if (res.headers) {
    Object.entries(res.headers).forEach(([key, value]) => {
      res.setHeader(key, value)
    })
  }

  if (res.cookies) {
    Object.entries(res.cookies).forEach(([key, value]) => {
      res.cookie(key, value)
    })
  }

  return res.status(response.status).json(response.data)
}
