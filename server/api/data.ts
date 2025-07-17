import { AutoRouter, error } from 'itty-router'
import { D1 } from '../bindings/d1'
import { R2 } from '../bindings/r2'
import { newResponse } from '../utils/response'
import { Auth } from '../utils/auth'
import { Constant, EXPIRY_VALUES } from '../constants'
import { Utils } from '../utils'
import { IRequest } from '../types'

const key = 'word'

const word_router = AutoRouter({ base: '/api/:word/data' })
const view_router = AutoRouter({ base: '/api/v/:view_word/data' })

/**
 * Get keyword metadata details
 */
word_router.get('', async (req: IRequest, env: Env) => request4GetData(req, env))
view_router.get('', async (req: IRequest, env: Env) => request4GetData(req, env))
const request4GetData = async (req: IRequest, env: Env) => {
  const keyword = await getKeyword(req, env)

  if (keyword) {
    // If password exists, display it as *******
    if (keyword.password) {
      keyword.password = Constant.PASSWORD_DISPLAY
    }
    // If view mode, hide word
    if (!req.edit) {
      keyword.word = ''
    }
    keyword.content = await downloadContent(req, env)
  }

  // Throw 404 error in view mode if data not found
  if (!req.edit && !keyword) {
    return error(404, req.t('errors.contentNotFound'))
  }

  return newResponse({ data: keyword })
}

/**
 * Create new keyword
 */
word_router.post('', async (req: IRequest, env: Env) => request4PostData(req, env))
view_router.post('', async (req: IRequest, env: Env) => request4PostData(req, env))
const request4PostData = async (req: IRequest, env: Env) => {
  console.log('data post', req.word)
  const data: Keyword = (await req.json()) as Keyword
  const { content, ...keywordDB } = data
  keywordDB.word = req.word // Prevent user from passing word

  // Hash password if set
  if (keywordDB.password) {
    keywordDB.password = await Auth.hashPassword(env, keywordDB.password, req.word)
  }

  // Upload content to R2
  await uploadContent(req, env, content)
  // Insert word info to database
  return D1.insert(env, 'keyword', keywordDB).then((data) => newResponse({ data }))
}

/**
 * Update keyword info (content-related fields only)
 */
word_router.put('', async (req: IRequest, env: Env) => request4PutData(req, env))
view_router.put('', async (req: IRequest, env: Env) => request4PutData(req, env))
const request4PutData = async (req: IRequest, env: Env) => {
  console.log('data put', req.word)
  const data: Keyword = (await req.json()) as Keyword

  // Upload content to R2
  await uploadContent(req, env, data.content)
  // Update timestamp in database
  return D1.update(env, 'keyword', { word: req.word }, [{ key, value: req.word }]).then((data) =>
    newResponse({ data })
  )
}

/**
 * Delete keyword
 */
word_router.delete('', async (req: IRequest, env: Env) => request4DeleteData(req, env))
view_router.delete('', async (req: IRequest, env: Env) => request4DeleteData(req, env))
const request4DeleteData = async (req: IRequest, env: Env) => {
  await deleteKeyword(env, req.word)
  // Clear cookie
  const response = newResponse({ data: null })
  req.clearCookie4auth = true
  return response
}

/**
 * Save settings (expiry time and password)
 */
word_router.patch('/settings', async (req: IRequest, env: Env) => request4PatchSettings(req, env))
view_router.patch('/settings', async (req: IRequest, env: Env) => request4PatchSettings(req, env))
const request4PatchSettings = async (req: IRequest, env: Env) => {
  const keyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'word', value: req.word }])
  if (!keyword) {
    return error(404, req.t('errors.contentNotFound'))
  }

  const settings = (await req.json()) as { expire_value: number; password?: string | null }

  // 1. Validate expire_value is within allowed range
  if (!EXPIRY_VALUES.includes(settings.expire_value)) {
    return error(400, req.t('errors.invalidSettings'))
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
    const hashPassword = await Auth.hashPassword(env, newPassword, keyword.word)
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

    const responseData: { message: string; view_word?: string } = {
      message: req.t('common.msg.saveSuccess'),
    }
    if (passwordChanged && updateData.view_word) {
      responseData.view_word = updateData.view_word
    }

    // Set authorization cookie if password changed
    if (passwordChanged && updateData.password) {
      req.cookie4auth = await Auth.encrypt(env, `${keyword.word}:${Date.now()}`)
    }

    return newResponse({ data: responseData })
  } catch (err) {
    console.error('Settings update failed:', err)
    return error(500, req.t('errors.settingsSaveError'))
  }
}

/**
 * Reset view_word for readonly link
 */
word_router.patch('/view-word', async (req: IRequest, env: Env) => request4PatchViewWord(req, env))
view_router.patch('/view-word', async (req: IRequest, env: Env) => request4PatchViewWord(req, env))
const request4PatchViewWord = async (req: IRequest, env: Env) => {
  const keyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'word', value: req.word }])
  if (!keyword) {
    return error(404, req.t('errors.contentNotFound'))
  }

  const newViewWord = Utils.getRandomWord(6)

  try {
    await D1.update(env, 'keyword', { view_word: newViewWord }, [{ key: 'word', value: req.word }])
    return newResponse({ data: { view_word: newViewWord } })
  } catch (err) {
    console.error('View word reset failed:', err)
    return error(500, req.t('errors.settingsSaveError'))
  }
}

const deleteKeyword = async (env: Env, word: string) => {
  // Delete index.txt file in R2
  await R2.delete(env, { prefix: word, name: Constant.PASTE_FILE })
  // Delete files folder in R2
  await R2.deleteFolder(env, { prefix: word + '/' + Constant.FILE_FOLDER })
  // Delete keyword info in database
  await D1.delete(env, 'keyword', [{ key, value: word }])
}

const getKeyword = async (req: IRequest, env: Env) => {
  let keyword: Keyword | null = null
  if (req.edit) {
    keyword = await D1.first<Keyword>(env, 'keyword', [{ key, value: req.word }])
  } else {
    keyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'view_word', value: req.view_word }])
  }
  return keyword
}

/**
 * Upload clipboard content to R2
 */
const uploadContent = async (req: IRequest, env: Env, content: string | undefined) => {
  // Delete file in R2 if content is empty
  if (!content) {
    return R2.delete(env, { prefix: req.word, name: Constant.PASTE_FILE, language: req.language })
  }
  // Upload to R2 if content is not empty
  const contentBuffer = new TextEncoder().encode(content)
  // Create a fixed-length stream using Response
  await R2.upload(env, {
    prefix: req.word,
    name: Constant.PASTE_FILE,
    length: contentBuffer.length,
    stream: new Response(contentBuffer).body,
    language: req.language,
  })
}

const downloadContent = async (req: IRequest, env: Env) => {
  return await R2.download(req, env, { prefix: req.word, name: Constant.PASTE_FILE })
    .then((res) => (res.status === 404 ? '' : res.text()))
    .catch((err) => {
      console.error(err)
      return ''
    })
}

export { word_router, view_router, getKeyword, deleteKeyword }
