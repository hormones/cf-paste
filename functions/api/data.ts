import { AutoRouter } from 'itty-router'
import { Env, Keyword, KeywordDB } from '../types/worker-configuration'
import { D1 } from '../bindings/d1'
import { R2 } from '../bindings/r2'
import { newErrorResponse, newResponse } from '../utils/response'
import { Auth } from '../utils/auth'
import { Constant } from '../constant'

const keyword = 'keyword'
const key = 'word'

const router = AutoRouter({ base: '/api/data' })

/**
 * 获取关键词元数据详情
 * @route GET /api/data
 * @returns {Promise<Response>} 关键词信息
 */
router.get('', async (request, env: Env) => {
  console.log('get', env.word)
  // 1. 先获取数据库中的关键词信息
  const data = await D1.first<KeywordDB, Keyword>(env, keyword, [{ key, value: env.word }])

  // 2. 如果找到数据，则获取对应的内容
  if (data) {
    if (data.password) {
      data.password = Constant.PASSWORD_DISPLAY
    }
    if (!env.edit) {
      data.word = ''
    }
    data.content = await downloadContent(env, env.word)
  }

  // 浏览模式找不到数据则抛出404异常
  if (!data && !env.edit) {
    return newErrorResponse(env, { msg: '关键词不存在', status: 404 })
  }

  return newResponse({ data: data })
})

/**
 * 创建新的关键词
 * @route POST /api/data
 * @body {Object} data - 关键词数据
 * @returns {Promise<Response>} 创建结果，包含新记录ID
 */
router.post('', async (request, env: Env) => {
  const data: Keyword = (await request.json()) as Keyword
  const { content, ...keywordDB } = data
  // 将content上传到R2
  await uploadContent(env, data.word, content)
  // word信息插入数据库
  return D1.insert(env, keyword, keywordDB).then((data) => newResponse({ data }))
})

/**
 * 更新关键词信息
 * @route PUT /api/data
 * @body {Object} data - 要更新的数据
 * @returns {Promise<Response>} 更新结果，包含更新的记录数
 */
router.put('', async (request, env: Env) => {
  const data: Keyword = (await request.json()) as Keyword
  const { content, ...keywordDB } = data
  // 将content上传到R2
  await uploadContent(env, data.word, content)
  // word信息插入数据库
  return D1.update<KeywordDB>(env, keyword, keywordDB, [{ key, value: env.word }]).then((data) =>
    newResponse({ data }),
  )
})

/**
 * 删除关键词
 * @route DELETE /api/data
 * @returns {Promise<Response>} 删除结果，包含删除的记录数
 */
router.delete('', async (request, env: Env) => {
  // 删除R2中的index.txt文件
  await R2.delete(env, { prefix: env.word, name: Constant.PASTE_NAME })
  // TODO...删除R2中的文件夹files 不生效
  await R2.delete(env, { prefix: env.word, name: Constant.FILE_FOLDER })
  // 删除数据库中的关键词信息
  await D1.delete<KeywordDB>(env, keyword, [{ key, value: env.word }])

  // 清除cookie
  const response = newResponse({ data: 1 })
  Auth.clearCookie(response, 'authorization', 'timestamp')
  return response
})

/**
 * 上传剪切板内容到R2
 * @param env 环境变量
 * @param word 关键词
 * @param content 剪切板内容
 */
const uploadContent = async (env: Env, word: string, content: string) => {
  if (content) {
    const contentBuffer = new TextEncoder().encode(content)
    // 使用 Response 创建一个固定长度的流
    await R2.upload(env, {
      prefix: word,
      name: Constant.PASTE_NAME,
      length: contentBuffer.length,
      // @ts-expect-error 类型错误
      stream: new Response(contentBuffer).body,
    })
  }
}

const downloadContent = async (env: Env, word: string) => {
  return await R2.download(env, { prefix: word, name: Constant.PASTE_NAME })
    .then((res) => (res.status === 404 ? '' : res.text()))
    .catch((error) => {
      console.error(error)
      return ''
    })
}

export default { ...router }
