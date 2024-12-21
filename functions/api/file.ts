import { AutoRouter } from 'itty-router'
import { R2 } from '../bindings/r2'
import { ReadableStream } from '@cloudflare/workers-types/experimental'

const router = AutoRouter({ base: '/api/file' })

/**
 * 列出指定前缀下的所有文件
 * @route GET /api/file/list
 * @returns {Promise<Response>} 文件列表
 */
router.get('/list', async (request, env) => {
  return R2.list(env, { prefix: env.word })
})

/**
 * 下载指定文件
 * @route GET /api/file/:name
 * @param {string} name - 文件名
 * @returns {Promise<Response>} 文件内容
 */
router.get('/:name', async (request, env) => {
  const name = request.param('name')
  return R2.download(env, {
    prefix: env.word,
    name: name,
  })
})

/**
 * 上传文件
 * @route POST /api/file/:name
 * @param {string} name - 文件名
 * @param {string} content-length - 文件大小(header)
 * @param {ReadableStream} body - 文件内容
 * @returns {Promise<Response>} 上传结果
 */
router.post('/:name', async (request, env) => {
  const name = request.param('name')
  const length = request.headers.get('content-length')
  return R2.upload(env, {
    prefix: env.word,
    name: name,
    length: Number(length),
    stream: request.body as ReadableStream<Uint8Array>,
  })
})

/**
 * 删除指定文件
 * @route DELETE /api/file/:name
 * @param {string} name - 文件名
 * @returns {Promise<Response>} 删除结果
 */
router.delete('/:name', async (request, env) => {
  const name = request.param('name')
  return R2.delete(env, {
    prefix: env.word,
    name: name,
  })
})

export default { ...router }