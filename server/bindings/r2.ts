/**
 * R2对象存储操作封装
 * 提供文件上传、下载、删除和列表等基础操作
 * @module bindings/r2
 */

import { Utils } from '../utils'
import { newErrorResponse, newResponse } from '../utils/response'

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
  download: async (env: Env, context: IContext, { prefix, name }: { prefix: string; name: string }) => {
    const path = `${prefix}/${name}`
    // 返回流
    return env.R2.get(path).then((object: any) => {
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
    context: IContext,
    {
      prefix,
      name,
      length,
      stream,
    }: { prefix: string; name: string; length: number; stream: ReadableStream<Uint8Array> | null }
  ) => {
    const path = `${prefix}/${name}`
    Utils.log(context, `upload file: ${path}, size: ${Utils.humanReadableSize(length)}`)
    if (!stream || length <= 0) {
      return newErrorResponse(context, { logMsg: 'stream或length为空', msg: 'file is required' })
    }
    // 小文件直接上传
    if (length <= CHUNK_SIZE) {
      return env.R2.put(path, stream, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: { uploadedAt: new Date().toISOString() },
      })
        .then(() => newResponse({}))
        .catch((error) => newErrorResponse(context, { error, logMsg: '上传文件失败' }))
    }

    // 创建分片上传任务
    let multipartUpload: R2MultipartUpload | null = null
    try {
      multipartUpload = await env.R2.createMultipartUpload(path, {
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
          const uploadedPart = await multipartUpload?.uploadPart(partNumber, uploadChunk)
          if (uploadedPart) {
            uploadedParts.push(uploadedPart)
          }
          partNumber++
          Utils.log(
            context,
            `uploaded part: ${partNumber}, size: ${Utils.humanReadableSize(uploadChunk.length)}`
          )
        }
        if (done) break
      }

      // 完成分片上传
      return multipartUpload?.complete(uploadedParts).then(() => newResponse({}))
    } catch (error) {
      // 出错时中止分片上传
      await multipartUpload?.abort()
      return newErrorResponse(context, { error })
    }
  },

  /**
   * 删除文件
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @param name 文件名
   * @returns 删除结果
   */
  delete: async (
    env: Env,
    context: IContext,
    { prefix, name }: { prefix: string; name: string }
  ) => {
    const path = `${prefix}/${name}`
    Utils.log(context, `delete file: ${path}`)
    return env.R2.delete(path)
      .then(() => newResponse({}))
      .catch((error: any) => newErrorResponse(context, { error, logMsg: '删除文件失败' }))
  },

  /**
   * 列出指定前缀下的所有文件
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @returns 文件列表
   */
  list: async (env: Env, context: IContext, { prefix }: { prefix: string }) => {
    try {
      const list = await env.R2.list({ prefix: prefix })
      const data = list.objects.map((obj: any) => ({
        name: decodeURIComponent(obj.key.replace(prefix + '/', '')),
        size: obj.size,
        uploaded: obj.uploaded,
        etag: obj.etag,
      }))
      return newResponse({ data })
    } catch (error) {
      return newErrorResponse(context, { error, logMsg: 'LIST文件失败' })
    }
  },

  /**
   * 删除指定前缀下的所有文件（递归删除文件夹）
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @returns 删除的文件数量
   */
  deleteFolder: async (
    env: Env,
    context: IContext,
    { prefix }: { prefix: string }
  ): Promise<number> => {
    let deletedCount = 0
    let cursor: string | undefined

    try {
      do {
        // 列出文件，支持分页
        const listResult = await env.R2.list({
          prefix: prefix,
          cursor: cursor,
          limit: 1000, // R2单次最多返回1000个对象
        })

        if (listResult.objects.length === 0) {
          break
        }

        // 批量删除文件
        const deletePromises = listResult.objects.map((obj: any) => env.R2.delete(obj.key))

        await Promise.all(deletePromises)
        deletedCount += listResult.objects.length

        // 记录删除日志
        Utils.log(
          context,
          `Deleted ${listResult.objects.length} files from ${prefix}, total: ${deletedCount}`
        )

        // 获取下一批的游标
        if (listResult.truncated && listResult.objects.length > 0) {
          cursor = listResult.objects[listResult.objects.length - 1].key
        } else {
          break
        }
      } while (cursor)

      Utils.log(context, `Folder deletion completed: ${prefix}, total deleted: ${deletedCount}`)
      return deletedCount
    } catch (error) {
      Utils.error(context, `Failed to delete folder ${prefix}`, error)
      throw error
    }
  },

  /**
   * 批量删除文件
   * @param env 环境变量
   * @param keys 要删除的文件路径数组
   * @returns 删除的文件数量
   */
  batchDelete: async (env: Env, context: IContext, keys: string[]): Promise<number> => {
    if (keys.length === 0) {
      return 0
    }

    try {
      // 并发删除文件，但限制并发数量避免过载
      const batchSize = 50 // 每批最多50个文件
      let deletedCount = 0

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        const deletePromises = batch.map((key) =>
          env.R2.delete(key).catch((error: any) => {
            Utils.error(context, `Failed to delete ${key}`, error)
            return null // 继续删除其他文件
          })
        )

        const results = await Promise.all(deletePromises)
        const successCount = results.filter((result: any) => result !== null).length
        deletedCount += successCount

        Utils.log(context, `Batch deleted ${successCount}/${batch.length} files`)
      }

      Utils.log(context, `Batch deletion completed: ${deletedCount}/${keys.length} files`)
      return deletedCount
    } catch (error) {
      Utils.error(context, 'Batch deletion failed', error)
      throw error
    }
  },
}
