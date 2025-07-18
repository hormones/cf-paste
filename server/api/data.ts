import { ApiResponse, IContext, IRequest, Keyword } from '../types'
import { Utils } from '../utils'
import { Auth } from '../utils/auth'
import { Constant, EXPIRY_VALUES } from '../constants'

export async function getData(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const keyword = await getKeyword(req, ctx)

  if (keyword) {
    // If password exists, display it as *******
    if (keyword.password) {
      keyword.password = Constant.PASSWORD_DISPLAY
    }
    if (!req.edit) {
      keyword.word = ''
    }
    keyword.content = await downloadContent(req, ctx)
  }

  if (!req.edit && !keyword) {
    return {
      code: 404,
      msg: req.t('errors.contentNotFound'),
      status: 404,
    }
  }

  return { code: 0, data: keyword }
}

export async function createData(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const data: Keyword = await req.json()
  const { content, ...keywordDB } = data
  keywordDB.word = req.word

  // Hash password if set
  if (keywordDB.password) {
    keywordDB.password = await Auth.hashPassword(ctx.config.AUTH_KEY, keywordDB.password, req.word)
  }

  // Upload content to storage
  await uploadContent(req, ctx, content)
  const result = await ctx.db.insert('keyword', keywordDB)

  return { code: 0, data: result }
}

export async function updateData(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const data: Keyword = await req.json()

  await uploadContent(req, ctx, data.content)
  const result = await ctx.db.update('keyword', { update_time: Date.now() }, [
    { key: 'word', value: req.word },
  ])

  return { code: 0, data: result }
}

export async function deleteData(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  await deleteKeyword(ctx, req.word)

  return {
    code: 0,
    data: null,
    headers: { 'Set-Cookie': 'auth=; Max-Age=0; Path=/' },
  }
}

export async function updateSettings(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const keyword = await ctx.db.first<Keyword>('keyword', [{ key: 'word', value: req.word }])

  if (!keyword) {
    return {
      code: 404,
      msg: req.t('errors.contentNotFound'),
      status: 404,
    }
  }

  const settings = (await req.json()) as { expire_value: number; password?: string | null }

  if (!EXPIRY_VALUES.includes(settings.expire_value)) {
    return {
      code: 400,
      msg: req.t('errors.invalidSettings'),
      status: 400,
    }
  }

  const updateData: Record<string, any> = {
    expire_value: settings.expire_value,
    expire_time: Date.now() + settings.expire_value * 1000,
  }

  let passwordChanged = false
  const newPassword = settings.password

  if (!newPassword) {
    if (keyword.password) {
      passwordChanged = true
      updateData.password = ''
    }
  } else if (newPassword !== Constant.PASSWORD_DISPLAY) {
    const hashedPassword = await Auth.hashPassword(ctx.config.AUTH_KEY, newPassword, keyword.word)
    if (hashedPassword !== keyword.password) {
      passwordChanged = true
      updateData.password = hashedPassword
    }
  }
  // If newPassword === '******', don't process password field

  if (passwordChanged) {
    updateData.view_word = Utils.getRandomWord(6)
  }

  try {
    await ctx.db.update('keyword', updateData, [{ key: 'word', value: req.word }])

    const responseData: { message: string; view_word?: string } = {
      message: req.t('common.msg.saveSuccess'),
    }

    if (passwordChanged && updateData.view_word) {
      responseData.view_word = updateData.view_word
    }

    const headers: Record<string, string> = {}
    if (passwordChanged && updateData.password) {
      const authToken = await Auth.encrypt(ctx.config.AUTH_KEY, `${keyword.word}:${Date.now()}`)
      headers['Set-Cookie'] = `auth=${authToken}; Path=/; HttpOnly`
    }

    return { code: 0, data: responseData, headers }
  } catch (err) {
    console.error('Settings update failed:', err)
    return {
      code: 500,
      msg: req.t('errors.settingsSaveError'),
      status: 500,
    }
  }
}

export async function updateViewWord(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const newViewWord = Utils.getRandomWord(6)
  try {
    await ctx.db.update('keyword', { view_word: newViewWord }, [{ key: 'word', value: req.word }])
    return { code: 0, data: { view_word: newViewWord } }
  } catch (err) {
    console.error('view word reset failed:', err)
    return {
      code: 500,
      msg: req.t('errors.settingsSaveError'),
      status: 500,
    }
  }
}

async function deleteKeyword(ctx: IContext, word: string): Promise<void> {
  await ctx.storage.delete({ prefix: word, name: Constant.PASTE_FILE })
  await ctx.storage.deleteFolder({ prefix: `${word}/${Constant.FILE_FOLDER}` })
  await ctx.db.delete('keyword', [{ key: 'word', value: word }])
}

async function getKeyword(req: IRequest, ctx: IContext): Promise<Keyword | null> {
  if (req.edit) {
    return await ctx.db.first<Keyword>('keyword', [{ key: 'word', value: req.word }])
  } else {
    return await ctx.db.first<Keyword>('keyword', [{ key: 'view_word', value: req.view_word }])
  }
}

async function uploadContent(
  req: IRequest,
  ctx: IContext,
  content: string | undefined
): Promise<void> {
  if (!content) {
    await ctx.storage.delete({ prefix: req.word, name: Constant.PASTE_FILE })
    return
  }

  const contentBuffer = new TextEncoder().encode(content)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(contentBuffer)
      controller.close()
    },
  })

  await ctx.storage.upload({
    prefix: req.word,
    name: Constant.PASTE_FILE,
    length: contentBuffer.length,
    stream,
  })
}

async function downloadContent(req: IRequest, ctx: IContext): Promise<string> {
  try {
    const result = await ctx.storage.download({ prefix: req.word, name: Constant.PASTE_FILE })
    return result.status === 404 ? '' : await result.text()
  } catch (err) {
    console.error(err)
    return ''
  }
}
