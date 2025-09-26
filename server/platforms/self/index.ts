import { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { IRequest, IContext, ApiResponse, CommonConfig } from '../../types'
import { createSqliteAdapter } from './sqlite'
import { createLocalStorageAdapter } from './local-storage'
import { createNodeTimerAdapter } from './node-timer'
import { DEFAULT_CONFIG } from '../../constants'
import { t as translate, detectLanguageFromRequest } from '../../i18n'

export function createContext(env: NodeJS.ProcessEnv): IContext {
  const dbPath = env.DB_PATH || './data/database.sqlite'
  const storagePath = env.STORAGE_PATH || './data/storage'

  const config: CommonConfig = {
    AUTH_KEY: env.AUTH_KEY || '',
    MAX_FILE_SIZE: parseInt(env.MAX_FILE_SIZE || DEFAULT_CONFIG.MAX_FILE_SIZE.toString()),
    MAX_TOTAL_SIZE: parseInt(env.MAX_TOTAL_SIZE || DEFAULT_CONFIG.MAX_TOTAL_SIZE.toString()),
    MAX_FILES: parseInt(env.MAX_FILES || DEFAULT_CONFIG.MAX_FILES.toString()),
    CHUNK_SIZE: parseInt(env.CHUNK_SIZE || DEFAULT_CONFIG.CHUNK_SIZE.toString()),
    CHUNK_THRESHOLD: parseInt(env.CHUNK_THRESHOLD || DEFAULT_CONFIG.CHUNK_THRESHOLD.toString()),
    LANGUAGE: env.LANGUAGE || DEFAULT_CONFIG.LANGUAGE,
    ADMIN_DASH_PASSWORD: env.ADMIN_DASH_PASSWORD,
  }

  return {
    platform: 'selfhost',
    config,
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

export function createRequest(request: ExpressRequest, context: IContext): IRequest {
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

  const acceptLanguage = request.headers['accept-language']
  const detectedLanguage = detectLanguageFromRequest(context.config.LANGUAGE, acceptLanguage)

  return {
    edit,
    id: null,
    word,
    view_word,
    language: detectedLanguage,
    t: (key: string, params?: Record<string, string | number>) =>
      translate(detectedLanguage, key, params),
    request: request,
    ip: request.ip || request.socket.remoteAddress || '',
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
