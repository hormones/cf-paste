import { AutoRouter } from 'itty-router'
import { newResponse } from '../utils/response'

const router = AutoRouter({ base: '/api/config' })

/**
 * 获取上传配置
 * @route GET /api/config/upload
 */
router.get('/upload', async (req: IRequest, env: Env) => {
  const config = {
    maxFileSize: parseInt(env.MAX_FILE_SIZE || '300') * 1024 * 1024, // 300MB
    maxTotalSize: parseInt(env.MAX_TOTAL_SIZE || '300') * 1024 * 1024, // 300MB
    maxFiles: parseInt(env.MAX_FILES || '10'), // 10个文件
    chunkSize: parseInt(env.CHUNK_SIZE || '50') * 1024 * 1024, // 50MB分片
    chunkThreshold: parseInt(env.CHUNK_THRESHOLD || '100') * 1024 * 1024, // 100MB阈值
    maxConcurrent: parseInt(env.MAX_CONCURRENT || '3'), // 3个并发
  }
  return newResponse({ data: config })
})

export default router
