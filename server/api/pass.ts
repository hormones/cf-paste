import { AutoRouter, error } from 'itty-router'
import { newResponse } from '../utils/response'
import { Auth } from '../utils/auth'
import { getKeyword } from './data'

const word_router = AutoRouter({ base: '/:word/api/pass' })
const view_router = AutoRouter({ base: '/v/:view_word/api/pass' })

/**
 * 验证密码
 * @route POST /api/pass/verify
 * @body { password: string }
 * @returns {Promise<Response>} 验证结果
 */
word_router.post('/verify', async (req: IRequest, env: Env) => request4Verify(env, req))
view_router.post('/verify', async (req: IRequest, env: Env) => request4Verify(env, req))
const request4Verify = async (env: Env, req: IRequest) => {
  const { password } = (await req.json()) as { password: string }
  const keyword: Keyword | null = await getKeyword(env, req, req.word, req.view_word)

  if (!keyword) {
    console.error(`通过 ${req.word} | ${req.view_word} 找不到对应的keyword信息`)
    return error(410, '访问出错了，页面不存在')
  }
  req.word = keyword.word
  req.view_word = keyword.view_word

  // 密码存在，且密码验证失败，返回403
  if (keyword?.password) {
    const isValid = await Auth.verifyPassword(password, keyword.password, keyword.word!, env)
    if (!isValid) {
      return error(403, '密码错误')
    }
  }

  // 密码不存在或验证成功，设置cookie，返回200
  req.authorization = await Auth.encrypt(env, `${keyword!.word!}:${Date.now()}`)
  return newResponse({})
}

/**
 * 获取PASTE配置
 * @route GET /api/pass/config
 */
word_router.get('/config', async (req: IRequest, env: Env) => request4Config(env, req))
view_router.get('/config', async (req: IRequest, env: Env) => request4Config(env, req))
const request4Config = async (env: Env, req: IRequest) => {
  const config = {
    maxFileSize: parseInt(env.MAX_FILE_SIZE || '300') * 1024 * 1024, // 300MB
    maxTotalSize: parseInt(env.MAX_TOTAL_SIZE || '300') * 1024 * 1024, // 300MB
    maxFiles: parseInt(env.MAX_FILES || '10'), // 10个文件
    chunkSize: parseInt(env.CHUNK_SIZE || '50') * 1024 * 1024, // 50MB分片
    chunkThreshold: parseInt(env.CHUNK_THRESHOLD || '100') * 1024 * 1024, // 100MB阈值
  }
  return newResponse({ data: config })
}

export { word_router, view_router }
