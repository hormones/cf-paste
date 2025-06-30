import { AutoRouter } from 'itty-router'
import { R2 } from '../bindings/r2'
import { Constant } from '../constant'
import { newResponse, newErrorResponse } from '../utils/response'

/**
 * 文件相关API
 * 存储在R2中，每个word下都有一个files文件夹
 */
const router = AutoRouter({ base: '/api/file' })

/**
 * 下载指定文件
 * @route GET /api/file/:name
 * @param {string} name - 文件名
 * @returns {Promise<Response>} 文件内容
 */
router.get('/download', async (req: IRequest, env) => {
  const name = req.query.name as string
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  return R2.download(env, req, { prefix, name })
})

/**
 * 列出指定前缀下的所有文件
 * @route GET /api/file/list
 * @returns {Promise<Response>} 文件列表
 */
router.get('/list', async (req: IRequest, env) => {
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  return R2.list(env, req, { prefix })
})

/**
 * 上传文件
 * @route POST /api/file/:name
 * @param {string} name - 文件名
 * @param {string} content-length - 文件大小(header)
 * @param {ReadableStream} body - 文件内容
 * @returns {Promise<Response>} 上传结果
 */
router.post('/:name', async (req: IRequest, env) => {
  const { name } = req.params
  const length = req.headers.get('content-length')
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  return R2.upload(env, req, {
    prefix,
    name,
    length: Number(length),
    stream: req.body as unknown as ReadableStream<Uint8Array>,
  })
})

/**
 * 删除指定文件
 * @route DELETE /api/file/:name
 * @param {string} name - 文件名
 * @returns {Promise<Response>} 删除结果
 */
router.delete('/:name', async (req: IRequest, env) => {
  const { name } = req.params
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  return R2.delete(env, req, { prefix, name })
})

/**
 * 删除所有文件（一键删除）
 * @route DELETE /api/file/batch/all
 * @returns {Promise<Response>} 删除结果
 */
router.delete('/batch/all', async (req: IRequest, env) => {
  try {
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`

    // 使用R2的deleteFolder方法批量删除所有文件
    const deletedCount = await R2.deleteFolder(env, req, { prefix })

    return newResponse({
      data: {
        deletedCount,
        message: `成功删除 ${deletedCount} 个文件`
      }
    })
  } catch (error) {
    return newErrorResponse(req, {
      error,
      msg: '批量删除文件失败',
      status: 500
    })
  }
})

// === 分片上传相关接口 ===

/**
 * 初始化分片上传
 * @route POST /api/file/multipart/init
 * @body {filename: string, fileSize: number, chunkSize: number}
 * @returns {Promise<Response>} 上传会话信息
 */
router.post('/multipart/init', async (req: IRequest, env: Env) => {
  try {
    const { filename, fileSize, chunkSize } = await req.json() as {
      filename: string
      fileSize: number
      chunkSize: number
    }

    // 参数验证
    if (!filename || !fileSize || !chunkSize) {
      return newErrorResponse(req, { msg: '缺少必要参数', status: 400 })
    }

    // 文件大小验证
    const envVars = env as any
    const maxFileSize = parseInt(envVars.MAX_FILE_SIZE || '300') * 1024 * 1024
    if (fileSize > maxFileSize) {
      return newErrorResponse(req, {
        msg: `文件大小超过限制 ${maxFileSize / (1024 * 1024)}MB`,
        status: 400
      })
    }

    // 直接使用原始文件名
    const uniqueFilename = filename
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`

    // 初始化R2分片上传
    const result = await R2.createMultipartUpload(env, req, {
      prefix,
      name: uniqueFilename
    })

    const totalChunks = Math.ceil(fileSize / chunkSize)

    return newResponse({
      data: {
        uploadId: result.uploadId,
        fileKey: result.key,
        originalFilename: filename,
        uniqueFilename,
        totalChunks,
        chunkSize,
        fileSize
      }
    })
  } catch (error) {
    return newErrorResponse(req, { error, msg: '初始化分片上传失败', status: 500 })
  }
})

/**
 * 取消分片上传
 * @route DELETE /api/file/multipart/cancel/:uploadId
 * @param {string} uploadId - 上传ID
 * @body {{ fileKey: string }}
 * @returns {Promise<Response>}
 */
router.delete('/multipart/cancel/:uploadId', async (req: IRequest, env: Env) => {
  try {
    const { uploadId } = req.params
    const { fileKey } = await req.json<{ fileKey: string }>()

    if (!uploadId || !fileKey) {
      return newErrorResponse(req, { msg: '缺少必要参数', status: 400 })
    }

    // 调用R2的abortMultipartUpload
    await R2.abortMultipartUpload(env, req, { uploadId, key: fileKey })

    return newResponse({
      data: { message: '上传已取消' }
    })
  } catch (error) {
    return newErrorResponse(req, { error, msg: '取消分片上传失败', status: 500 })
  }
})

/**
 * 上传单个分片
 * @route POST /api/file/multipart/chunk/:uploadId/:chunkIndex
 * @param {string} uploadId - 上传ID
 * @param {string} chunkIndex - 分片索引（从0开始）
 * @query {string} fileKey - 文件路径
 * @body 分片数据
 * @returns {Promise<Response>} 分片上传结果
 */
router.post('/multipart/chunk/:uploadId/:chunkIndex', async (req: IRequest, env: Env) => {
  try {
    const { uploadId, chunkIndex } = req.params
    const partNumber = parseInt(chunkIndex) + 1 // R2 partNumber从1开始

    if (!uploadId || !partNumber || partNumber < 1) {
      return newErrorResponse(req, { msg: '无效的上传参数', status: 400 })
    }

    // 从请求头获取fileKey
    const fileKey = req.headers.get('X-File-Key')
    if (!fileKey) {
      return newErrorResponse(req, { msg: '缺少fileKey参数', status: 400 })
    }

    // 获取分片数据
    const chunkData = await req.arrayBuffer()
    if (!chunkData || chunkData.byteLength === 0) {
      return newErrorResponse(req, { msg: '分片数据为空', status: 400 })
    }

    // 上传分片到R2
    const result = await R2.uploadPart(env, req, {
      uploadId,
      key: fileKey,
      partNumber,
      data: chunkData
    })

    return newResponse({
      data: {
        partNumber: result.partNumber,
        etag: result.etag,
        size: chunkData.byteLength
      }
    })
  } catch (error) {
    return newErrorResponse(req, { error, msg: '上传分片失败', status: 500 })
  }
})

/**
 * 完成分片上传
 * @route POST /api/file/multipart/complete/:uploadId
 * @param {string} uploadId - 上传ID
 * @query {string} fileKey - 文件路径
 * @body {parts: Array<{partNumber: number, etag: string}>}
 * @returns {Promise<Response>} 完成结果
 */
router.post('/multipart/complete/:uploadId', async (req: IRequest, env: Env) => {
  try {
    const { uploadId } = req.params
    const { fileKey, parts } = await req.json() as {
      fileKey: string
      parts: Array<{ partNumber: number; etag: string }>
    }

    if (!uploadId || !fileKey || !parts || !Array.isArray(parts)) {
      return newErrorResponse(req, { msg: '缺少必要参数', status: 400 })
    }

    // 验证分片完整性
    const sortedParts = parts
      .map(part => ({
        partNumber: part.partNumber,
        etag: part.etag
      }))
      .sort((a, b) => a.partNumber - b.partNumber)

    // 检查分片序号连续性
    for (let i = 0; i < sortedParts.length; i++) {
      if (sortedParts[i].partNumber !== i + 1) {
        return newErrorResponse(req, {
          msg: `分片序号不连续，缺少第${i + 1}个分片`,
          status: 400
        })
      }
    }

    // 完成R2分片上传
    const result = await R2.completeMultipartUpload(env, req, {
      uploadId,
      key: fileKey,
      parts: sortedParts
    })

    // 从fileKey中提取文件名信息
    const pathParts = fileKey.split('/')
    const uniqueFilename = pathParts[pathParts.length - 1]
    const originalFilename = uniqueFilename.substring(uniqueFilename.indexOf('-', uniqueFilename.indexOf('-') + 1) + 1)

    return newResponse({
      data: {
        fileKey,
        originalFilename,
        uniqueFilename,
        etag: result.etag,
        size: result.size,
        uploadId,
        message: '文件上传完成'
      }
    })
  } catch (error) {
    return newErrorResponse(req, { error, msg: '完成分片上传失败', status: 500 })
  }
})

export default { ...router }
