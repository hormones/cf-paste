import { AutoRouter, error } from 'itty-router'
import { D1 } from '../bindings/d1'
import { R2 } from '../bindings/r2'
import { newResponse } from '../utils/response'
import { Auth } from '../utils/auth'
import { Constant } from '../constant'
import { Utils } from '../utils'

const key = 'word'

const word_router = AutoRouter({ base: '/:word/api/data' })
const view_router = AutoRouter({ base: '/v/:view_word/api/data' })

/**
 * Get keyword metadata details
 */
word_router.get('', async (req: IRequest, env: Env) => request4GetData(env, req))
view_router.get('', async (req: IRequest, env: Env) => request4GetData(env, req))
const request4GetData = async (env: Env, req: IRequest) => {
  console.log('data get', req.word)
  // First get keyword info from database
  const data = await D1.first<Keyword>(env, 'keyword', [{ key, value: req.word }])

  // If data found, get corresponding content
  if (data) {
    if (data.password) {
      data.password = Constant.PASSWORD_DISPLAY
    }
    if (!req.edit) {
      data.word = ''
    }
    data.content = await downloadContent(env, req)
  }

  // Throw 404 error in view mode if data not found
  if (!data && !req.edit) {
    return error(404, 'Keyword not found')
  }

  return newResponse({ data: data })
}

/**
 * Create new keyword
 */
word_router.post('', async (req: IRequest, env: Env) => request4PostData(env, req))
view_router.post('', async (req: IRequest, env: Env) => request4PostData(env, req))
const request4PostData = async (env: Env, req: IRequest) => {
  console.log('data post', req.word)
  const data: Keyword = (await req.json()) as Keyword
  const { content, ...keywordDB } = data
  keywordDB.word = req.word // Prevent user from passing word

  // Hash password if set
  if (keywordDB.password) {
    keywordDB.password = await Auth.hashPassword(keywordDB.password, req.word!, env)
  }

  // Upload content to R2
  await uploadContent(env, req, content)
  // Insert word info to database
  return D1.insert(env, 'keyword', keywordDB).then((data) => newResponse({ data }))
}

/**
 * Update keyword info (content-related fields only)
 */
word_router.put('', async (req: IRequest, env: Env) => request4PutData(env, req))
view_router.put('', async (req: IRequest, env: Env) => request4PutData(env, req))
const request4PutData = async (env: Env, req: IRequest) => {
  console.log('data put', req.word)
  const data: Keyword = (await req.json()) as Keyword

  // Upload content to R2
  await uploadContent(env, req, data.content)
  // Update timestamp in database
  return D1.update(env, 'keyword', { word: req.word }, [{ key, value: req.word }]).then((data) =>
    newResponse({ data })
  )
}

/**
 * Delete keyword
 */
word_router.delete('', async (req: IRequest, env: Env) => request4DeleteData(env, req))
view_router.delete('', async (req: IRequest, env: Env) => request4DeleteData(env, req))
const request4DeleteData = async (env: Env, req: IRequest) => {
  await deleteKeyword(env, req.word)
  // Clear cookie
  const response = newResponse({ data: null })
  req.clearAuthCookie = true
  return response
}

/**
 * Save settings (expiry time and password)
 */
word_router.patch('/settings', async (req: IRequest, env: Env) => request4PatchSettings(env, req))
view_router.patch('/settings', async (req: IRequest, env: Env) => request4PatchSettings(env, req))
const request4PatchSettings = async (env: Env, req: IRequest) => {
  const keyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'word', value: req.word }])
  if (!keyword) {
    return error(404, 'Keyword not found')
  }

  const settings = (await req.json()) as { expire_value: number; password?: string | null }

  // 1. Validate expire_value is within allowed range
  if (!Constant.ALLOWED_EXPIRE_VALUES.includes(settings.expire_value)) {
    return error(400, 'Invalid expiry time setting')
  }

  // 2. Build update data
  const updateData: Record<string, any> = {
    expire_value: settings.expire_value,
    expire_time: Date.now() + settings.expire_value * 1000,
  }

  // 3. Handle password setting and view_word update
  let passwordChanged = false
  const newPassword = settings.password

  if (!newPassword) {
    // Intent: remove password
    if (keyword.password) {
      passwordChanged = true
      updateData.password = ''
    }
  } else if (newPassword !== Constant.PASSWORD_DISPLAY) {
    // Intent: set or modify password
    const hashPassword = await Auth.hashPassword(newPassword, req.word!, env)
    if (hashPassword !== keyword.password) {
      passwordChanged = true
      updateData.password = hashPassword
    }
  }
  // If newPassword === '******', don't process password field

  if (passwordChanged) {
    updateData.view_word = Utils.getRandomWord(6)
  }

  // 4. Update database
  try {
    await D1.update(env, 'keyword', updateData, [{ key: 'word', value: req.word }])

    const responseData: { message: string; view_word?: string } = { message: 'Settings saved' }
    if (passwordChanged && updateData.view_word) {
      responseData.view_word = updateData.view_word
    }

    // Set authorization cookie if password changed
    if (passwordChanged && updateData.password) {
      req.authorization = await Auth.encrypt(env, `${keyword.word}:${Date.now()}`)
    }

    return newResponse({ data: responseData })
  } catch (err) {
    console.error('Settings update failed:', err)
    return error(500, 'Failed to save settings')
  }
}

/**
 * Reset view_word for readonly link
 */
word_router.patch('/view-word', async (req: IRequest, env: Env) => request4PatchViewWord(env, req))
view_router.patch('/view-word', async (req: IRequest, env: Env) => request4PatchViewWord(env, req))
const request4PatchViewWord = async (env: Env, req: IRequest) => {
  const keyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'word', value: req.word }])
  if (!keyword) {
    return error(404, 'Keyword not found')
  }

  const newViewWord = Utils.getRandomWord(6)

  try {
    await D1.update(env, 'keyword', { view_word: newViewWord }, [{ key: 'word', value: req.word }])
    return newResponse({ data: { view_word: newViewWord } })
  } catch (err) {
    console.error('View word reset failed:', err)
    return error(500, 'Failed to reset readonly link')
  }
}

/**
 * Upload clipboard content to R2
 */
const uploadContent = async (env: Env, req: IRequest, content: string) => {
  // Delete file in R2 if content is empty
  if (!content) {
    return R2.delete(env, { prefix: req.word, name: Constant.PASTE_FILE })
  }
  // Upload to R2 if content is not empty
  const contentBuffer = new TextEncoder().encode(content)
  // Create a fixed-length stream using Response
  await R2.upload(env, {
    prefix: req.word,
    name: Constant.PASTE_FILE,
    length: contentBuffer.length,
    stream: new Response(contentBuffer).body,
  })
}

const downloadContent = async (env: Env, req: IRequest) => {
  return await R2.download(env, req, { prefix: req.word, name: Constant.PASTE_FILE })
    .then((res) => (res.status === 404 ? '' : res.text()))
    .catch((err) => {
      console.error(err)
      return ''
    })
}

export const deleteKeyword = async (env: Env, word: string) => {
  // Delete index.txt file in R2
  await R2.delete(env, { prefix: word, name: Constant.PASTE_FILE })
  // Delete files folder in R2
  await R2.deleteFolder(env, { prefix: word + '/' + Constant.FILE_FOLDER })
  // Delete keyword info in database
  await D1.delete(env, 'keyword', [{ key, value: word }])
}

export const getKeyword = async (
  env: Env,
  req: IRequest,
  c_word: string | null,
  c_view_word: string | null
) => {
  let keyword: Keyword | null = null
  if (c_word) {
    keyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'word', value: c_word }])
  } else if (c_view_word) {
    keyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'view_word', value: c_view_word }])
  }
  return keyword
}

export { word_router, view_router }
