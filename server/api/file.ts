import { AutoRouter } from 'itty-router'
import { R2 } from '../bindings/r2'
import { Constant } from '../constant'
import { newResponse } from '../utils/response'
import { error } from 'itty-router'

/**
 * 文件相关API
 * 存储在R2中，每个word下都有一个files文件夹
 */
const word_router = AutoRouter({ base: '/:word/api/file' })
const view_router = AutoRouter({ base: '/v/:view_word/api/file' })

/**
 * 列出指定前缀下的所有文件
 * @route GET /api/file/list
 * @returns {Promise<Response>} 文件列表
 */
word_router.get('/list', async (req: IRequest, env) => request4List(env, req))
view_router.get('/list', async (req: IRequest, env) => request4List(env, req))
const request4List = async (env: Env, req: IRequest) => {
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  return R2.list(env, { prefix })
}

/**
 * 下载指定文件
 * @query {string} name - 文件名
 * @returns {Promise<Response>} 文件内容
 */
word_router.get('/download', async (req: IRequest, env: Env) => request4Download(env, req))
view_router.get('/download', async (req: IRequest, env: Env) => request4Download(env, req))
const request4Download = async (env: Env, req: IRequest) => {
  const url = new URL(req.url)
  const fileName = url.searchParams.get('name')
  if (!fileName) {
    return error(400, 'file name is required')
  }

  const prefix = `${req.word}/${Constant.FILE_FOLDER}`

  // 调用支持断点续传的 R2.download
  return R2.download(env, req, { prefix, name: fileName })
}

/**
 * 上传文件
 * @route POST /api/file/:name
 * @param {string} name - 文件名
 * @param {string} content-length - 文件大小(header)
 * @param {ReadableStream} body - 文件内容
 * @returns {Promise<Response>} 上传结果
 */
word_router.post('', async (req: IRequest, env) => request4Upload(env, req))
const request4Upload = async (env: Env, req: IRequest) => {
  const url = new URL(req.url)
  const name = url.searchParams.get('name')
  if (!name) {
    return error(400, 'file name is required')
  }
  // 从URL路径参数获取的文件名是编码过的，需要手动解码
  const decodedName = decodeURIComponent(name)
  const length = req.headers.get('content-length')
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  console.log('upload file: ', decodedName, prefix)
  return R2.upload(env, {
    prefix,
    name: decodedName,
    length: Number(length),
    stream: req.body as unknown as ReadableStream<Uint8Array>,
  })
}

/**
 * 删除所有文件（一键删除）
 * @route DELETE /api/file/batch/all
 * @returns {Promise<Response>} 删除结果
 */
word_router.delete('/all', async (req: IRequest, env) => request4DeleteAll(env, req))
const request4DeleteAll = async (env: Env, req: IRequest) => {
  try {
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`

    // 使用R2的deleteFolder方法批量删除所有文件
    const deletedCount = await R2.deleteFolder(env, { prefix })

    return newResponse({
      data: {
        deletedCount,
        message: `成功删除 ${deletedCount} 个文件`,
      },
    })
  } catch (err) {
    console.error('批量删除文件失败', err)
    return error(500, '批量删除文件失败')
  }
}

/**
 * 删除指定文件
 * @route DELETE /api/file/:name
 * @param {string} name - 文件名
 * @returns {Promise<Response>} 删除结果
 */
word_router.delete('', async (req: IRequest, env) => request4Delete(env, req))
const request4Delete = async (env: Env, req: IRequest) => {
  const url = new URL(req.url)
  const name = url.searchParams.get('name')
  if (!name) {
    return error(400, 'file name is required')
  }
  // 从URL路径参数获取的文件名是编码过的，需要手动解码
  const decodedName = decodeURIComponent(name)
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  console.log('delete file: ', decodedName, prefix)
  return R2.delete(env, { prefix, name: decodedName })
}

// === 分片上传相关接口 ===

/**
 * 初始化分片上传
 * @route POST /api/file/multipart/init
 * @body {filename: string, fileSize: number, chunkSize: number}
 * @returns {Promise<Response>} 上传会话信息
 */
word_router.post('/multipart/init', async (req: IRequest, env: Env) =>
  request4MultipartInit(env, req)
)
const request4MultipartInit = async (env: Env, req: IRequest) => {
  try {
    const { filename, fileSize, chunkSize } = (await req.json()) as {
      filename: string
      fileSize: number
      chunkSize: number
    }

    // 参数验证
    if (!filename || !fileSize || !chunkSize) {
      return error(400, '缺少必要参数')
    }

    // 文件大小验证
    const maxFileSize = parseInt(env.MAX_FILE_SIZE || '300') * 1024 * 1024
    if (fileSize > maxFileSize) {
      return error(400, `文件大小超过限制 ${maxFileSize / (1024 * 1024)}MB`)
    }

    // 直接使用原始文件名
    const uniqueFilename = filename
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`

    // 初始化R2分片上传
    const result = await R2.createMultipartUpload(env, {
      prefix,
      name: uniqueFilename,
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
        fileSize,
      },
    })
  } catch (err) {
    console.error('初始化分片上传失败', err)
    return error(500, '初始化分片上传失败')
  }
}

/**
 * 取消分片上传
 * @route DELETE /api/file/multipart/cancel/:uploadId
 * @param {string} uploadId - 上传ID
 * @body {{ fileKey: string }}
 * @returns {Promise<Response>}
 */
word_router.delete('/multipart/cancel/:uploadId', async (req: IRequest, env: Env) =>
  request4MultipartCancel(env, req)
)
const request4MultipartCancel = async (env: Env, req: IRequest) => {
  try {
    const { uploadId } = req.params
    const { fileKey } = await req.json<{ fileKey: string }>()

    if (!uploadId || !fileKey) {
      return error(400, '缺少必要参数')
    }

    // 调用R2的abortMultipartUpload
    await R2.abortMultipartUpload(env, { uploadId, key: fileKey })

    return newResponse({
      data: { message: '上传已取消' },
    })
  } catch (err) {
    console.error('取消分片上传失败', err)
    return error(500, '取消分片上传失败')
  }
}

/**
 * 上传单个分片
 * @route POST /api/file/multipart/chunk/:uploadId/:chunkIndex
 * @param {string} uploadId - 上传ID
 * @param {string} chunkIndex - 分片索引（从0开始）
 * @query {string} fileKey - 文件路径
 * @body 分片数据
 * @returns {Promise<Response>} 分片上传结果
 */
word_router.post('/multipart/chunk/:uploadId/:chunkIndex', async (req: IRequest, env: Env) =>
  request4MultipartChunk(env, req)
)
const request4MultipartChunk = async (env: Env, req: IRequest) => {
  try {
    const { uploadId, chunkIndex } = req.params
    const partNumber = parseInt(chunkIndex) + 1 // R2 partNumber从1开始

    if (!uploadId || !partNumber || partNumber < 1) {
      return error(400, '无效的上传参数')
    }

    // 从请求头获取fileKey并解码
    const encodedFileKey = req.headers.get('X-File-Key')
    if (!encodedFileKey) {
      return error(400, '缺少fileKey参数')
    }
    const fileKey = decodeURIComponent(encodedFileKey)

    // 获取分片数据
    const chunkData = await req.arrayBuffer()
    if (!chunkData || chunkData.byteLength === 0) {
      return error(400, '分片数据为空')
    }

    // 上传分片到R2
    const result = await R2.uploadPart(env, {
      uploadId,
      key: fileKey,
      partNumber,
      data: chunkData,
    })

    return newResponse({
      data: {
        partNumber: result.partNumber,
        etag: result.etag,
        size: chunkData.byteLength,
      },
    })
  } catch (err) {
    console.error('上传分片失败', err)
    return error(500, '上传分片失败')
  }
}

/**
 * 完成分片上传
 * @route POST /api/file/multipart/complete/:uploadId
 * @param {string} uploadId - 上传ID
 * @query {string} fileKey - 文件路径
 * @body {parts: Array<{partNumber: number, etag: string}>}
 * @returns {Promise<Response>} 完成结果
 */
word_router.post('/multipart/complete/:uploadId', async (req: IRequest, env: Env) =>
  request4MultipartComplete(env, req)
)
const request4MultipartComplete = async (env: Env, req: IRequest) => {
  try {
    const { uploadId } = req.params
    const { fileKey, parts } = (await req.json()) as {
      fileKey: string
      parts: Array<{ partNumber: number; etag: string }>
    }

    if (!uploadId || !fileKey || !parts || !Array.isArray(parts)) {
      return error(400, '缺少必要参数')
    }

    // 验证分片完整性
    const sortedParts = parts
      .map((part) => ({
        partNumber: part.partNumber,
        etag: part.etag,
      }))
      .sort((a, b) => a.partNumber - b.partNumber)

    // 检查分片序号连续性
    for (let i = 0; i < sortedParts.length; i++) {
      if (sortedParts[i].partNumber !== i + 1) {
        return error(400, `分片序号不连续，缺少第${i + 1}个分片`)
      }
    }

    // 完成R2分片上传
    const result = await R2.completeMultipartUpload(env, { uploadId, key: fileKey, parts })

    // 从fileKey中提取文件名信息
    const pathParts = fileKey.split('/')
    const uniqueFilename = pathParts[pathParts.length - 1]
    const originalFilename = uniqueFilename.substring(
      uniqueFilename.indexOf('-', uniqueFilename.indexOf('-') + 1) + 1
    )

    return newResponse({
      data: {
        fileKey,
        originalFilename,
        uniqueFilename,
        etag: result.etag,
        size: result.size,
        uploadId,
        message: '文件上传完成',
      },
    })
  } catch (err) {
    console.error('完成分片上传失败', err)
    return error(500, '完成分片上传失败')
  }
}

export { word_router, view_router }
