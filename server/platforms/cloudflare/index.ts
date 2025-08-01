import { IRequest, IContext, ApiResponse, CommonConfig } from '../../types'
import { CloudflareConfig } from '../../types/platforms'
import { DEFAULT_CONFIG } from '../../constants'
import { createD1Adapter } from './d1'
import { createR2Adapter } from './r2'

export function createRequest(request: Request, env: Env): IRequest {
  const url = new URL(request.url)
  const edit = url.pathname.startsWith('/api/v/') ? 0 : 1
  const word = edit ? url.pathname.split('/')[2] : ''
  const view_word = edit ? '' : url.pathname.split('/')[3]
  const params: Record<string, string> = {}
  if (url.searchParams) {
    url.searchParams.forEach((value, key) => {
      params[key] = value
    })
  }

  return {
    edit,
    word,
    view_word,
    language: env.LANGUAGE || DEFAULT_CONFIG.LANGUAGE,
    ip: request.headers.get('cf-connecting-ip') || 'unknown',
    location: request.headers.get('cf-ipcountry') || 'unknown',
    params: params,
    request,
    json: () => request.json(),
    text: () => request.text(),
    method: request.method,
    path: url.pathname,
    getHeader: (name: string) => request.headers.get(name),
    t: (key: string, params?: Record<string, string | number>) => {
      // TODO: implement i18n translation
      return key
    },
  }
}

export function createContext(env: Env): IContext {
  const commonConfig: CommonConfig = {
    AUTH_KEY: env.AUTH_KEY,
    MAX_FILE_SIZE: parseInt(env.MAX_FILE_SIZE || DEFAULT_CONFIG.MAX_FILE_SIZE.toString()),
    MAX_TOTAL_SIZE: parseInt(env.MAX_TOTAL_SIZE || DEFAULT_CONFIG.MAX_TOTAL_SIZE.toString()),
    MAX_FILES: parseInt(env.MAX_FILES || DEFAULT_CONFIG.MAX_FILES.toString()),
    CHUNK_SIZE: parseInt(env.CHUNK_SIZE || DEFAULT_CONFIG.CHUNK_SIZE.toString()),
    CHUNK_THRESHOLD: parseInt(env.CHUNK_THRESHOLD || DEFAULT_CONFIG.CHUNK_THRESHOLD.toString()),
    LANGUAGE: env.LANGUAGE || DEFAULT_CONFIG.LANGUAGE,
  }

  const platformConfig: CloudflareConfig = {
    DB: env.DB,
    R2: env.R2,
    ASSETS: env.ASSETS,
  }

  return {
    platform: 'cloudflare',
    config: commonConfig,
    platformConfig,
    original: env,
    db: createD1Adapter(env.DB),
    storage: createR2Adapter(env.R2),
    timer: null as any,
  }
}

export function createResponse(apiResponse: ApiResponse): Response {
  const status = apiResponse.status || 200

  // Handle streaming responses
  if (apiResponse.streaming && apiResponse.data) {
    const headers = new Headers(apiResponse.headers)

    // For streaming responses, return the stream directly
    if (apiResponse.data && typeof apiResponse.data.getReader === 'function') {
      return new Response(apiResponse.data as ReadableStream, {
        status,
        headers,
      })
    }
  }

  // Regular JSON response
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...apiResponse.headers,
  })

  const body = JSON.stringify({
    code: apiResponse.code,
    data: apiResponse.data,
    msg: apiResponse.msg,
  })

  return new Response(body, {
    status,
    headers,
  })
}
