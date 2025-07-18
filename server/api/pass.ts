import { IRequest, IContext, ApiResponse } from '../types'
import { Auth } from '../utils/auth'

export async function handlePasswordVerify(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const { password } = await req.json()
  const keyword = await getKeyword(req, ctx)

  if (!keyword) {
    console.error(`cannot find keyword by ${req.word} | ${req.view_word}`)
    return {
      code: 410,
      msg: req.t('errors.contentNotFound'),
      status: 410
    }
  }
  req.word = keyword.word
  req.view_word = keyword.view_word!

  if (keyword?.password) {
    const isValid = await Auth.verifyPassword(ctx.config.AUTH_KEY, password, keyword.password, keyword.word)
    if (!isValid) {
      return {
        code: 403,
        msg: req.t('errors.incorrectPassword'),
        status: 403
      }
    }
  }

  const authToken = await Auth.encrypt(ctx.config.AUTH_KEY, `${keyword!.word!}:${Date.now()}`)

  return {
    code: 0,
    data: {},
    headers: { 'Set-Cookie': `auth=${authToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400` }
  }
}

export async function handleGetConfig(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const config = {
    maxFileSize: ctx.config.MAX_FILE_SIZE * 1024 * 1024,
    maxTotalSize: ctx.config.MAX_TOTAL_SIZE * 1024 * 1024,
    maxFiles: ctx.config.MAX_FILES,
    chunkSize: ctx.config.CHUNK_SIZE * 1024 * 1024,
    chunkThreshold: ctx.config.CHUNK_THRESHOLD * 1024 * 1024,
    language: req.language
  }

  return {
    code: 0,
    data: config
  }
}

async function getKeyword(req: IRequest, ctx: IContext) {
  if (req.edit) {
    return await ctx.db.first('keyword', [{ key: 'word', value: req.word }])
  } else {
    return await ctx.db.first('keyword', [{ key: 'view_word', value: req.view_word }])
  }
}
