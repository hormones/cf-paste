import { AutoRouter } from 'itty-router'
import { Env, Keyword, KeywordDB } from '../types/worker-configuration'
import { D1 } from '../bindings/d1'
import { R2 } from '../bindings/r2'
import { newResponse } from '../utils/response'
import { ReadableStream } from '@cloudflare/workers-types/experimental'
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
  // 获取R2中word文件夹下的index.txt文件内容
  const content = await (
    await R2.download(env, { prefix: env.word, name: Constant.PASTE_NAME })
  ).text()
  // 获取数据库中的关键词信息
  return D1.first<KeywordDB, Keyword>(env, keyword, [{ key, value: env.word }]).then((data) => {
    if (data) {
      data.content = content
    }
    return newResponse({ data })
  })
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
  // 删除数据库中的关键词信息
  return D1.delete<KeywordDB>(env, keyword, [{ key, value: env.word }]).then((data) =>
    newResponse({ data }),
  )
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
    const length = contentBuffer.length
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(contentBuffer)
        controller.close()
      },
    })
    await R2.upload(env, { prefix: word, name: Constant.PASTE_NAME, length, stream })
  }
}

export default { ...router }
