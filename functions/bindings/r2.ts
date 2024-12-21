import { Env } from '../types/worker-configuration'
import { Utils } from '../utils'
import { newErrorResponse, newResponse } from '../utils/response'
import {
  R2MultipartUpload,
  R2UploadedPart,
  ReadableStream,
} from '@cloudflare/workers-types/experimental'

const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB 分片

/**
 * R2存储绑定
 */
export const R2 = {
  /**
   * 下载文件
   * @param env 环境变量
   * @param prefix 文件路径
   * @param name 文件名称
   * @returns
   */
  download: async (env: Env, { prefix, name }: { prefix: string; name: string }) => {
    const path = `${prefix}/${name}`
    // 返回流
    return env.BUCKET.get(path)
      .then((object) => {
        if (!object) {
          return newErrorResponse({ msg: 'File not found', status: 404 })
        }
        return new Response(object.body as unknown as BodyInit, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${name}"`,
            'Content-Length': object.size.toString(),
            'Accept-Ranges': 'bytes',
            etag: object.httpEtag,
          },
        })
      })
      .catch((error) => {
        console.error('File download error', error)
        return newErrorResponse({ error })
      })
  },
  /**
   * 上传文件
   * @param env  环境变量
   * @param prefix 文件路径
   * @param name 文件名称
   * @param length 文件长度
   * @param stream 文件流
   * @returns
   */
  upload: async (
    env: Env,
    {
      prefix,
      name,
      length,
      stream,
    }: { prefix: string; name: string; length: number; stream: ReadableStream },
  ) => {
    const path = `${prefix}/${name}`
    Utils.log(env, `upload file: ${path}, size: ${Utils.humanReadableSize(length)}`)
    if (!stream || length <= 0) {
      return newErrorResponse({ msg: 'file is required' })
    }
    // 小文件直接上传
    if (length <= CHUNK_SIZE) {
      return env.BUCKET.put(path, stream, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: { uploadedAt: new Date().toISOString() },
      })
        .then(() => newResponse({}))
        .catch((error) => newErrorResponse({error}))
    }

    // 创建分片上传任务
    let multipartUpload: R2MultipartUpload | null = null
    try {
      multipartUpload = await env.BUCKET.createMultipartUpload(path, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: { uploadedAt: new Date().toISOString() },
      })
      const reader = stream.getReader()
      const uploadedParts: R2UploadedPart[] = []
      const chunks: Uint8Array[] = [] // 使用数组存储数据块
      let totalLength = 0
      let partNumber = 1
      while (true) {
        const { done, value } = await reader.read()
        if (value) {
          chunks.push(value)
          totalLength += value.length
        }
        // 当累积长度达到或超过分片大小，或者是最后一块数据时，执行上传
        while (totalLength >= CHUNK_SIZE || (done && totalLength > 0)) {
          // 确定这次要上传的大小（取CHUNK_SIZE和totalLength的较小值）
          const uploadSize = Math.min(CHUNK_SIZE, totalLength)
          const uploadChunk = new Uint8Array(uploadSize)
          let offset = 0

          while (offset < uploadSize) {
            const chunk = chunks[0]
            const remainingSpace = uploadSize - offset
            if (chunk.length <= remainingSpace) {
              uploadChunk.set(chunk, offset)
              offset += chunk.length
              totalLength -= chunk.length
              chunks.shift()
            } else {
              uploadChunk.set(chunk.subarray(0, remainingSpace), offset)
              chunks[0] = chunk.subarray(remainingSpace)
              totalLength -= remainingSpace
              break
            }
          }
          const uploadedPart = await multipartUpload.uploadPart(partNumber, uploadChunk)
          uploadedParts.push(uploadedPart)
          partNumber++
          Utils.log(
            env,
            `uploaded part: ${partNumber}, size: ${Utils.humanReadableSize(uploadChunk.length)}`,
          )
        }
        if (done) break
      }

      // 完成分片上传
      return multipartUpload.complete(uploadedParts).then(() => newResponse({}))
    } catch (error) {
      // 出错时中止分片上传
      await multipartUpload?.abort()
      return newErrorResponse({error})
    }
  },
  /**
   * 删除文件
   * @param env 环境变量
   * @param prefix 文件路径
   * @param name 文件名称
   * @returns
   */
  delete: async (env: Env, { prefix, name }: { prefix: string; name: string }) => {
    const path = `${prefix}/${name}`
    return env.BUCKET.delete(path)
      .then(() => newResponse({}))
      .catch((error) => newErrorResponse(error))
  },
  /**
   * 列出文件
   * @param env 环境变量
   * @param prefix 文件路径
   * @returns
   */
  list: async (env: Env, { prefix }: { prefix: string }) => {
    return env.BUCKET.list({ prefix: prefix })
      .then((objects) => newResponse({ data: objects }))
      .catch((error) => newErrorResponse({error}))
  },
}
