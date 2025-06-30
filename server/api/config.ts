import { AutoRouter } from 'itty-router'
import { newResponse } from '../utils/response'

const router = AutoRouter({ base: '/api/config' })

/**
 * 获取上传配置
 * @route GET /api/config/upload
 */
router.get('/upload', async (req: IRequest, env: Env) => {
  const envVars = env as any
  const config = {
    maxFileSize: parseInt(envVars.MAX_FILE_SIZE || '300') * 1024 * 1024,        // 300MB
    maxTotalSize: parseInt(envVars.MAX_TOTAL_SIZE || '300') * 1024 * 1024,      // 300MB
    maxFiles: parseInt(envVars.MAX_FILES || '10'),                              // 10个文件
    chunkSize: parseInt(envVars.CHUNK_SIZE || '50') * 1024 * 1024,              // 50MB分片
    chunkThreshold: parseInt(envVars.CHUNK_THRESHOLD || '100') * 1024 * 1024,   // 100MB阈值
    maxConcurrent: parseInt(envVars.MAX_CONCURRENT || '3')                      // 3个并发
  }
  return newResponse({ data: config })
})

export default router
