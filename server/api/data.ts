import { AutoRouter, error } from 'itty-router'
import { D1 } from '../bindings/d1'
import { R2 } from '../bindings/r2'
import { newResponse } from '../utils/response'
import { Auth } from '../utils/auth'
import { Constant } from '../constant'
import { Utils } from '../utils'

const keyword = 'keyword'
const key = 'word'

const router = AutoRouter({ base: '/api/data' })

/**
 * 获取关键词元数据详情
 * @route GET /api/data
 * @returns {Promise<Response>} 关键词信息
 */
router.get('', async (req: IRequest, env: Env) => {
  console.log('data get', req.word)
  // 1. 先获取数据库中的关键词信息
  const data = await D1.first<Keyword>(env, keyword, [{ key, value: req.word }])

  // 2. 如果找到数据，则获取对应的内容
  if (data) {
    if (data.password) {
      data.password = Constant.PASSWORD_DISPLAY
    }
    if (!req.edit) {
      data.word = ''
    }
    data.content = await downloadContent(env, req)
  }

  // 浏览模式找不到数据则抛出404异常
  if (!data && !req.edit) {
    return error(404, '关键词不存在')
  }

  return newResponse({ data: data })
})

/**
 * 创建新的关键词
 * @route POST /api/data
 * @body {Object} data - 关键词数据
 * @returns {Promise<Response>} 创建结果，包含新记录ID
 */
router.post('', async (req: IRequest, env: Env) => {
  console.log('data post', req.word)
  const data: Keyword = (await req.json()) as Keyword
  const { content, ...keywordDB } = data
  keywordDB.word = req.word // 防止用户传入word

  // 如果设置了密码，则进行哈希处理
  if (keywordDB.password) {
    keywordDB.password = await Auth.hashPassword(keywordDB.password, req.word!, env)
  }

  // 将content上传到R2
  await uploadContent(env, req, content)
  // word信息插入数据库
  return D1.insert(env, keyword, keywordDB).then((data) => newResponse({ data }))
})

/**
 * 更新关键词信息（仅内容相关字段）
 * @route PUT /api/data
 * @body {Object} data - 要更新的数据
 * @returns {Promise<Response>} 更新结果，包含更新的记录数
 */
router.put('', async (req: IRequest, env: Env) => {
  console.log('data put', req.word)
  const data: Keyword = (await req.json()) as Keyword

  // 将content上传到R2
  await uploadContent(env, req, data.content)
  // 更新数据库中的更新时间
  return D1.update(env, keyword, { word: req.word }, [{ key, value: req.word }]).then((data) =>
    newResponse({ data })
  )
})

/**
 * 删除关键词
 * @route DELETE /api/data
 * @returns {Promise<Response>} 删除结果，包含删除的记录数
 */
router.delete('', async (req: IRequest, env: Env) => {
  await deleteKeyword(env, req.word)
  // 清除cookie
  const response = newResponse({ data: null })
  Auth.clearCookie(response, 'authorization')
  return response
})

/**
 * 保存设置（过期时间和密码）
 * @route PATCH /api/data/settings
 * @body {Object} settings - 设置数据 {expire_value: number, password?: string}
 * @returns {Promise<Response>} 更新结果，包含更新的记录数
 */
router.patch('/settings', async (req: IRequest, env: Env) => {
  const currentKeyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'word', value: req.word }])
  if (!currentKeyword) {
    return error(404, '关键词不存在')
  }

  const settings = (await req.json()) as { expire_value: number; password?: string | null }

  // 1. 验证expire_value是否在允许范围内
  if (!Constant.ALLOWED_EXPIRE_VALUES.includes(settings.expire_value)) {
    return error(400, '无效的过期时间设置')
  }

  // 2. 构建更新数据
  const updateData: Record<string, any> = {
    expire_value: settings.expire_value,
    expire_time: Date.now() + settings.expire_value * 1000,
  }

  // 3. 处理密码设置和view_word更新
  let passwordChanged = false
  const newPassword = settings.password

  if (!newPassword) {
    // 意图：移除密码
    if (currentKeyword.password) {
      passwordChanged = true
      updateData.password = ''
    }
  } else if (newPassword !== Constant.PASSWORD_DISPLAY) {
    // 意图：设置或修改密码
    const hashPassword = await Auth.hashPassword(newPassword, req.word!, env)
    if (hashPassword !== currentKeyword.password) {
      passwordChanged = true
      updateData.password = hashPassword
    }
  }
  // 如果 newPassword === '******', 则不处理密码字段

  if (passwordChanged) {
    updateData.view_word = Utils.getRandomWord(6)
  }

  // 4. 更新数据库
  try {
    await D1.update(env, 'keyword', updateData, [{ key: 'word', value: req.word }])

    const responseData: { message: string; view_word?: string } = { message: '设置已保存' }
    if (passwordChanged && updateData.view_word) {
      responseData.view_word = updateData.view_word
    }

    return newResponse({ data: responseData })
  } catch (err) {
    console.error('Settings update failed:', err)
    return error(500, '保存设置失败')
  }
})

/**
 * 重置只读链接的 view_word
 * @route PATCH /api/data/view-word
 * @returns {Promise<Response>} 更新结果，包含新的 view_word
 */
router.patch('/view-word', async (req: IRequest, env: Env) => {
  const currentKeyword = await D1.first<Keyword>(env, 'keyword', [{ key: 'word', value: req.word }])
  if (!currentKeyword) {
    return error(404, '关键词不存在')
  }

  const newViewWord = Utils.getRandomWord(6)

  try {
    await D1.update(env, 'keyword', { view_word: newViewWord }, [{ key: 'word', value: req.word }])
    return newResponse({ data: { view_word: newViewWord } })
  } catch (err) {
    console.error('View word reset failed:', err)
    return error(500, '重置只读链接失败')
  }
})

/**
 * 上传剪贴板内容到R2
 * @param env 环境变量
 * @param word 关键词
 * @param content 剪贴板内容
 */
const uploadContent = async (env: Env, req: IRequest, content: string) => {
  // 如果content为空，则删除R2中的文件
  if (!content) {
    return R2.delete(env, { prefix: req.word, name: Constant.PASTE_FILE })
  }
  // 如果content不为空，则上传到R2
  const contentBuffer = new TextEncoder().encode(content)
  // 使用 Response 创建一个固定长度的流
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
  // 删除R2中的index.txt文件
  await R2.delete(env, { prefix: word, name: Constant.PASTE_FILE })
  // 删除R2中的文件夹files
  await R2.deleteFolder(env, { prefix: word + '/' + Constant.FILE_FOLDER })
  // 删除数据库中的关键词信息
  await D1.delete(env, keyword, [{ key, value: word }])
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

export default { ...router }
