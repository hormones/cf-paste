import { AutoRouter, error } from 'itty-router'
import { D1 } from '../bindings/d1'
import { R2 } from '../bindings/r2'
import { newErrorResponse, newResponse } from '../utils/response'
import { Auth } from '../utils/auth'
import { Constant } from '../constant'
import { validateExpireValue, calculateExpireTime } from '../utils/time'
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
  const data = await D1.first<Keyword>(env, req, keyword, [{ key, value: req.word }])

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
    return newErrorResponse(req, { msg: '关键词不存在', status: 404 })
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
  // 将content上传到R2
  await uploadContent(env, req, content)
  // word信息插入数据库
  return D1.insert(env, req, keyword, keywordDB).then((data) => newResponse({ data }))
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
  return D1.update(env, req, keyword, { word: req.word }, [{ key, value: req.word }]).then((data) =>
    newResponse({ data })
  )
})

/**
 * 删除关键词
 * @route DELETE /api/data
 * @returns {Promise<Response>} 删除结果，包含删除的记录数
 */
router.delete('', async (req: IRequest, env: Env) => {
  // 删除R2中的index.txt文件
  await R2.delete(env, req, { prefix: req.word, name: Constant.PASTE_FILE })
  // 删除R2中的文件夹files
  await R2.deleteFolder(env, req, { prefix: req.word + '/' + Constant.FILE_FOLDER })
  // 删除数据库中的关键词信息
  await D1.delete(env, req, keyword, [{ key, value: req.word }])

  // 清除cookie
  const response = newResponse({ data: 1 })
  Auth.clearCookie(response, 'authorization', 'timestamp')
  return response
})

/**
 * 保存设置（过期时间和密码）
 * @route PATCH /api/data/settings
 * @body {Object} settings - 设置数据 {expire_value: number, password?: string}
 * @returns {Promise<Response>} 更新结果，包含更新的记录数
 */
router.patch('/settings', async (req: IRequest, env: Env) => {
  const settings = (await req.json()) as { expire_value: number; password?: string | null }

  // 1. 验证expire_value是否在允许范围内
  if (!validateExpireValue(settings.expire_value)) {
    return newErrorResponse(req, {
      msg: '无效的过期时间设置',
      status: 400,
    })
  }

  // 2. 构建更新数据
  const updateData: Record<string, string | number> = {
    expire_value: settings.expire_value,
    expire_time: calculateExpireTime(settings.expire_value),
  }

  // 3. 处理密码设置
  if (settings.password) {
    // 如果是PASSWORD_DISPLAY，则不更新密码字段
    if (settings.password !== Constant.PASSWORD_DISPLAY) {
      updateData.password = settings.password
    }
  } else {
    updateData.password = ''
  }

  // 4. 更新数据库
  try {
    const result = await D1.update(env, req, keyword, updateData, [{ key, value: req.word }])
    return newResponse({ data: result })
  } catch (error) {
    console.error('Settings update failed:', error)
    return newErrorResponse(req, {
      msg: '保存设置失败',
      status: 500,
    })
  }
})

router.post('/verify', async (req: IRequest, env: Env) => {
  const c_word = Auth.getCookie(req, 'word')
  const c_view_word = Auth.getCookie(req, 'view_word')
  const { password } = (await req.json()) as { password: string }
  const keyword: Keyword | null = await getKeyword(env, req, c_word, c_view_word)

  if (!keyword) {
    Utils.error(req, `通过 ${c_word} | ${c_view_word} 找不到对应的keyword信息`)
    return error(404, '访问出错了，页面不存在')
  }

  // 密码存在，且密码验证失败，返回403
  if (keyword?.password && keyword?.password !== password) {
    return error(403, '密码错误')
  }

  // 密码不存在或验证成功，设置cookie，返回200
  req.timestamp = Date.now()
  req.authorization = await Auth.encrypt(env, `${keyword!.word!}:${req.timestamp!}:${req.edit}`)
  return newResponse({})
})

/**
 * 上传剪贴板内容到R2
 * @param env 环境变量
 * @param word 关键词
 * @param content 剪贴板内容
 */
const uploadContent = async (env: Env, req: IRequest, content: string) => {
  if (content) {
    const contentBuffer = new TextEncoder().encode(content)
    // 使用 Response 创建一个固定长度的流
    await R2.upload(env, req, {
      prefix: req.word,
      name: Constant.PASTE_FILE,
      length: contentBuffer.length,
      stream: new Response(contentBuffer).body,
    })
  }
}

const downloadContent = async (env: Env, req: IRequest) => {
  return await R2.download(env, req, { prefix: req.word, name: Constant.PASTE_FILE })
    .then((res) => (res.status === 404 ? '' : res.text()))
    .catch((error) => {
      console.error(error)
      return ''
    })
}

export const getKeyword = async (env: Env, req: IRequest, c_word: string | null, c_view_word: string | null) => {
  let keyword: Keyword | null = null
  if (c_word) {
    keyword = await D1.first<Keyword>(env, req, 'keyword', [{ key: 'word', value: c_word }])
  } else if (c_view_word) {
    keyword = await D1.first<Keyword>(env, req, 'keyword', [{ key: 'view_word', value: c_view_word }])
  }
  return keyword
}

export default { ...router }
