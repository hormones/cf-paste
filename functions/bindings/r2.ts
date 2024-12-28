/**
 * R2对象存储操作封装
 * 提供文件上传、下载、删除和列表等基础操作
 * @module bindings/r2
 */

import { Env } from '../types/worker-configuration'
import { Utils } from '../utils'
import { newErrorResponse, newResponse } from '../utils/response'
import {
  R2MultipartUpload,
  R2UploadedPart,
  ReadableStream,
} from '@cloudflare/workers-types/experimental'

/** 分片上传的块大小：10MB */
const CHUNK_SIZE = 10 * 1024 * 1024

/**
 * R2对象存储操作封装
 */
export const R2 = {
  /**
   * 下载文件
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @param name 文件名
   * @returns 文件内容流
   */
  download: async (env: Env, { prefix, name }: { prefix: string; name: string }) => {
    const path = `${prefix}/${name}`
    // 返回流
    return env.CF_PASTE.get(path).then((object) => {
      if (!object) {
        return newResponse({ msg: 'File not found', status: 404 })
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
  },

  /**
   * 上传文件
   * 支持大文件分片上传，超过10MB的文件会自动使用分片上传
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @param name 文件名
   * @param length 文件大小
   * @param stream 文件内容流
   * @returns 上传结果
   */
  upload: async (
    env: Env,
    {
      prefix,
      name,
      length,
      stream,
    }: { prefix: string; name: string; length: number; stream: ReadableStream<Uint8Array> | null },
  ) => {
    const path = `${prefix}/${name}`
    Utils.log(env, `upload file: ${path}, size: ${Utils.humanReadableSize(length)}`)
    if (!stream || length <= 0) {
      return newErrorResponse(env, { logMsg: 'stream或length为空', msg: 'file is required' })
    }
    // 小文件直接上传
    if (length <= CHUNK_SIZE) {
      return env.CF_PASTE.put(path, stream, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: { uploadedAt: new Date().toISOString() },
      })
        .then(() => newResponse({}))
        .catch((error) => newErrorResponse(env, { error, logMsg: '上传文件失败' }))
    }

    // 创建分片上传任务
    let multipartUpload: R2MultipartUpload | null = null
    try {
      multipartUpload = await env.CF_PASTE.createMultipartUpload(path, {
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
      return newErrorResponse(env, { error })
    }
  },

  /**
   * 删除文件
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @param name 文件名
   * @returns 删除结果
   */
  delete: async (env: Env, { prefix, name }: { prefix: string; name: string }) => {
    const path = `${prefix}/${name}`
    return env.CF_PASTE.delete(path)
      .then(() => newResponse({}))
      .catch((error) => newErrorResponse(env, { error, logMsg: '删除文件失败' }))
  },

  /**
   * 列出指定前缀下的所有文件
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @returns 文件列表
   */
  list: async (env: Env, { prefix }: { prefix: string }) => {
    try {
      const list = await env.CF_PASTE.list({ prefix: prefix })
      const data = list.objects.map((obj) => ({
        name: obj.key.replace(prefix + '/', ''),
        size: obj.size,
        uploaded: obj.uploaded,
        etag: obj.etag,
      }))
      return newResponse({ data })
    } catch (error) {
      return newErrorResponse(env, { error, logMsg: 'LIST文件失败' })
    }
  },
}
