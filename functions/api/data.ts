import { AutoRouter } from 'itty-router'
import { Env } from '../types/worker-configuration'
import { D1 } from '../bindings/d1'
import { newResponse } from '../utils/response'

const keyword = 'keyword'

const router = AutoRouter({ base: '/api/data' })

/**
 * 获取关键词详情
 * @route GET /api/data
 * @returns {Promise<Response>} 关键词信息
 */
router.get('', async (request, env: Env) => {
  return D1.first(env, keyword, [{ key: 'word', value: env.word }]).then((data) =>
    newResponse({ data }),
  )
})

/**
 * 创建新的关键词
 * @route POST /api/data
 * @body {Object} data - 关键词数据
 * @returns {Promise<Response>} 创建结果，包含新记录ID
 */
router.post('', async (request, env: Env) => {
  const data: Record<string, string | number> = await request.json()
  return D1.insert(env, keyword, data).then((data) => newResponse({ data }))
})

/**
 * 更新关键词信息
 * @route PUT /api/data
 * @body {Object} data - 要更新的数据
 * @returns {Promise<Response>} 更新结果，包含更新的记录数
 */
router.put('', async (request, env: Env) => {
  const data: Record<string, string | number> = await request.json()
  return D1.update(env, keyword, data, [{ key: 'word', value: env.word }])
})

/**
 * 删除关键词
 * @route DELETE /api/data
 * @returns {Promise<Response>} 删除结果，包含删除的记录数
 */
router.delete('', async (request, env: Env) => {
  return D1.delete(env, keyword, [{ key: 'word', value: env.word }])
})

export default { ...router }
