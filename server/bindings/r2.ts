/**
 * R2对象存储操作封装
 * 提供文件上传、下载、删除和列表等基础操作
 * @module bindings/r2
 */

import { error } from 'itty-router'
import { Utils } from '../utils'
import { newResponse } from '../utils/response'

/**
 * R2对象存储操作封装
 */
export const R2 = {
  /**
   * 下载文件
   * @param env 环境变量
   * @param req 请求对象
   * @param prefix 文件路径前缀
   * @param name 文件名
   * @returns 文件内容流
   */
  download: async (env: Env, req: IRequest, { prefix, name }: { prefix: string; name: string }) => {
    const path = `${prefix}/${name}`

    const headers = new Headers()
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}"`)
    headers.set('Accept-Ranges', 'bytes')

    const range = req.headers.get('range')

    if (range) {
      const objectMeta = await env.R2.head(path)
      if (objectMeta === null) {
        return newResponse({ msg: 'File not found', status: 404 })
      }

      const { start, end } = Utils.parseRange(range, objectMeta.size)

      if (start >= objectMeta.size || end >= objectMeta.size) {
        headers.set('Content-Range', `bytes */${objectMeta.size}`)
        return new Response('Range Not Satisfiable', { status: 416, headers })
      }

      const object = await env.R2.get(path, {
        range: { offset: start, length: end - start + 1 },
      })

      if (object === null) {
        return error(404, 'File not found')
      }

      headers.set('Content-Range', `bytes ${start}-${end}/${objectMeta.size}`)
      headers.set('Content-Length', (end - start + 1).toString())
      object.writeHttpMetadata(headers)
      headers.set('etag', object.httpEtag)

      return new Response(object.body, { status: 206, headers })
    }

    const object = await env.R2.get(path)
    if (object === null) {
      return error(404, 'File not found')
    }

    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('Content-Length', object.size.toString())

    return new Response(object.body, { headers })
  },

  /**
   * 直接上传文件到 R2
   * 前端已处理分片逻辑，这里只负责直接上传
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
    }: { prefix: string; name: string; length: number; stream: ReadableStream<Uint8Array> | null }
  ) => {
    const path = `${prefix}/${name}`
    console.log(`upload file: ${path}, size: ${Utils.humanReadableSize(length)}`)

    if (!stream || length <= 0) {
      return error(400, 'stream或length为空')
    }

    // 直接上传到 R2（前端已处理分片逻辑）
    return env.R2.put(path, stream, {
      httpMetadata: { contentType: 'application/octet-stream' },
      customMetadata: { uploadedAt: new Date().toISOString() },
    })
      .then(() => newResponse({}))
      .catch((err) => {
        console.error('上传文件失败', err)
        return error(500, '上传文件失败')
      })
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
    console.log(`delete file: ${path}`)
    return env.R2.delete(path)
      .then(() => newResponse({}))
      .catch((err) => {
        console.error('删除文件失败', err)
        return error(500, '删除文件失败')
      })
  },

  /**
   * 列出指定前缀下的所有文件
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @returns 文件列表
   */
  list: async (env: Env, { prefix }: { prefix: string }) => {
    try {
      const list = await env.R2.list({ prefix: prefix })
      const data = list.objects.map((obj: R2Object) => ({
        name: decodeURIComponent(obj.key.replace(prefix + '/', '')),
        size: obj.size,
        uploaded: obj.uploaded,
        etag: obj.etag,
      }))
      return newResponse({ data })
    } catch (err) {
      console.error('LIST文件失败', err)
      return error(500, 'LIST文件失败')
    }
  },

  /**
   * 删除指定前缀下的所有文件（递归删除文件夹）
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @returns 删除的文件数量
   */
  deleteFolder: async (env: Env, { prefix }: { prefix: string }): Promise<number> => {
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
        console.log(
          `Deleted ${listResult.objects.length} files from ${prefix}, total: ${deletedCount}`
        )

        // 获取下一批的游标
        if (listResult.truncated && listResult.objects.length > 0) {
          cursor = listResult.objects[listResult.objects.length - 1].key
        } else {
          break
        }
      } while (cursor)

      console.log(`Folder deletion completed: ${prefix}, total deleted: ${deletedCount}`)
      return deletedCount
    } catch (err) {
      console.error(`Failed to delete folder ${prefix}`, err)
      throw err
    }
  },

  /**
   * 批量删除文件
   * @param env 环境变量
   * @param keys 要删除的文件路径数组
   * @returns 删除的文件数量
   */
  batchDelete: async (env: Env, keys: string[]): Promise<number> => {
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
            console.error(`Failed to delete ${key}`, error)
            return null // 继续删除其他文件
          })
        )

        const results = await Promise.all(deletePromises)
        const successCount = results.filter((result: any) => result !== null).length
        deletedCount += successCount

        console.log(`Batch deleted ${successCount}/${batch.length} files`)
      }

      console.log(`Batch deletion completed: ${deletedCount}/${keys.length} files`)
      return deletedCount
    } catch (error) {
      console.error('Batch deletion failed', error)
      throw error
    }
  },

  /**
   * 初始化分片上传
   * @param env 环境变量
   * @param prefix 文件路径前缀
   * @param name 文件名
   * @returns 分片上传对象
   */
  createMultipartUpload: async (env: Env, { prefix, name }: { prefix: string; name: string }) => {
    const path = `${prefix}/${name}`
    console.log(`create multipart upload: ${path}`)

    try {
      const multipartUpload = await env.R2.createMultipartUpload(path, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: { uploadedAt: new Date().toISOString() },
      })

      return {
        uploadId: multipartUpload.uploadId,
        key: path,
      }
    } catch (error) {
      console.error(`Failed to create multipart upload for ${path}`, error)
      throw error
    }
  },

  /**
   * 上传分片
   * @param env 环境变量
   * @param uploadId 上传ID
   * @param key 文件路径
   * @param partNumber 分片号（从1开始）
   * @param data 分片数据
   * @returns 上传结果
   */
  uploadPart: async (
    env: Env,
    {
      uploadId,
      key,
      partNumber,
      data,
    }: {
      uploadId: string
      key: string
      partNumber: number
      data: ArrayBuffer
    }
  ) => {
    console.log(
      `upload part ${partNumber} for ${key}, size: ${Utils.humanReadableSize(data.byteLength)}`
    )

    try {
      const multipartUpload = await env.R2.resumeMultipartUpload(key, uploadId)
      const uploadedPart = await multipartUpload.uploadPart(partNumber, data)

      return {
        partNumber,
        etag: uploadedPart.etag,
      }
    } catch (error) {
      console.error(`Failed to upload part ${partNumber} for ${key}`, error)
      throw error
    }
  },

  /**
   * 完成分片上传
   * @param env 环境变量
   * @param uploadId 上传ID
   * @param key 文件路径
   * @param parts 分片信息数组
   * @returns 完成结果
   */
  completeMultipartUpload: async (
    env: Env,
    {
      uploadId,
      key,
      parts,
    }: {
      uploadId: string
      key: string
      parts: Array<{ partNumber: number; etag: string }>
    }
  ) => {
    console.log(`complete multipart upload for ${key}, parts: ${parts.length}`)

    try {
      const multipartUpload = await env.R2.resumeMultipartUpload(key, uploadId)
      const result = await multipartUpload.complete(parts)

      return {
        etag: result.etag,
        size: result.size,
      }
    } catch (error) {
      console.error(`Failed to complete multipart upload for ${key}`, error)
      throw error
    }
  },

  /**
   * 取消分片上传
   * @param env 环境变量
   * @param uploadId 上传ID
   * @param key 文件路径
   * @returns 取消结果
   */
  abortMultipartUpload: async (
    env: Env,
    {
      uploadId,
      key,
    }: {
      uploadId: string
      key: string
    }
  ) => {
    console.log(`abort multipart upload for ${key}`)

    try {
      const multipartUpload = await env.R2.resumeMultipartUpload(key, uploadId)
      await multipartUpload.abort()

      return { success: true }
    } catch (error) {
      console.error(`Failed to abort multipart upload for ${key}`, error)
      throw error
    }
  },
}
