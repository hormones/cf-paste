import { AutoRouter } from 'itty-router'
import { newResponse } from '../utils/response'

const word_router = AutoRouter({ base: '/:word/api/config' })
const view_router = AutoRouter({ base: '/v/:view_word/api/config' })

/**
 * 获取PASTE配置
 * @route GET /api/config/pass/paste
 */
word_router.get('/pass/paste', async (req: IRequest, env: Env) => request4Paste(env, req))
view_router.get('/pass/paste', async (req: IRequest, env: Env) => request4Paste(env, req))
const request4Paste = async (env: Env, req: IRequest) => {
  const config = {
    maxFileSize: parseInt(env.MAX_FILE_SIZE || '300') * 1024 * 1024, // 300MB
    maxTotalSize: parseInt(env.MAX_TOTAL_SIZE || '300') * 1024 * 1024, // 300MB
    maxFiles: parseInt(env.MAX_FILES || '10'), // 10个文件
    chunkSize: parseInt(env.CHUNK_SIZE || '50') * 1024 * 1024, // 50MB分片
    chunkThreshold: parseInt(env.CHUNK_THRESHOLD || '100') * 1024 * 1024, // 100MB阈值
    maxConcurrent: parseInt(env.MAX_CONCURRENT || '3'), // 3个并发
  }
  return newResponse({ data: config })
}

export { word_router, view_router }
