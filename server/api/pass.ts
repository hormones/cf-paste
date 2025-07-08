import { AutoRouter, error } from 'itty-router'
import { newResponse } from '../utils/response'
import { Auth } from '../utils/auth'
import { getKeyword } from './data'

const word_router = AutoRouter({ base: '/:word/api/pass' })
const view_router = AutoRouter({ base: '/v/:view_word/api/pass' })

/**
 * Verify password
 */
word_router.post('/verify', async (req: IRequest, env: Env) => request4Verify(env, req))
view_router.post('/verify', async (req: IRequest, env: Env) => request4Verify(env, req))
const request4Verify = async (env: Env, req: IRequest) => {
  const { password } = (await req.json()) as { password: string }
  const keyword: Keyword | null = await getKeyword(env, req, req.word, req.view_word)

  if (!keyword) {
    console.error(`Cannot find keyword info through ${req.word} | ${req.view_word}`)
    return error(410, 'Access error, page not found')
  }
  req.word = keyword.word
  req.view_word = keyword.view_word

  // If password exists and verification fails, return 403
  if (keyword?.password) {
    const isValid = await Auth.verifyPassword(password, keyword.password, keyword.word!, env)
    if (!isValid) {
      return error(403, 'Incorrect password')
    }
  }

  // If password doesn't exist or verification succeeds, set cookie and return 200
  req.authorization = await Auth.encrypt(env, `${keyword!.word!}:${Date.now()}`)
  return newResponse({})
}

/**
 * Get PASTE configuration
 */
word_router.get('/config', async (req: IRequest, env: Env) => request4Config(env, req))
view_router.get('/config', async (req: IRequest, env: Env) => request4Config(env, req))
const request4Config = async (env: Env, req: IRequest) => {
  const config = {
    maxFileSize: parseInt(env.MAX_FILE_SIZE || '300') * 1024 * 1024, // 300MB
    maxTotalSize: parseInt(env.MAX_TOTAL_SIZE || '300') * 1024 * 1024, // 300MB
    maxFiles: parseInt(env.MAX_FILES || '10'), // 10 files
    chunkSize: parseInt(env.CHUNK_SIZE || '50') * 1024 * 1024, // 50MB chunks
    chunkThreshold: parseInt(env.CHUNK_THRESHOLD || '100') * 1024 * 1024, // 100MB threshold
  }
  return newResponse({ data: config })
}

export { word_router, view_router }
