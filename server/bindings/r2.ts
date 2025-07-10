import { error } from 'itty-router'
import { Utils } from '../utils'
import { newResponse } from '../utils/response'
import { t } from '../i18n'

export const R2 = {
  /**
   * Download file with range support
   */
  download: async (env: Env, req: IRequest, { prefix, name }: { prefix: string; name: string }) => {
    const path = `${prefix}/${name}`

    const headers = new Headers()
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`)
    headers.set('Accept-Ranges', 'bytes')

    const range = req.headers.get('range')

    if (range) {
      const objectMeta = await env.R2.head(path)
      if (objectMeta === null) {
        return newResponse({ msg: req.t('errors.fileNotFound'), status: 404 })
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
        return error(404, req.t('errors.fileNotFound'))
      }

      headers.set('Content-Range', `bytes ${start}-${end}/${objectMeta.size}`)
      headers.set('Content-Length', (end - start + 1).toString())
      object.writeHttpMetadata(headers)
      headers.set('etag', object.httpEtag)

      return new Response(object.body, { status: 206, headers })
    }

    console.log('download file: ', path)
    const object = await env.R2.get(path)
    if (object === null) {
      return error(404, req.t('errors.fileNotFound'))
    }

    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('Content-Length', object.size.toString())

    return new Response(object.body, { headers })
  },

  /**
   * Upload file directly to R2
   * Frontend handles chunking logic, this only handles direct upload
   */
  upload: async (
    env: Env,
    {
      prefix,
      name,
      length,
      stream,
      language,
    }: { prefix: string; name: string; length: number; stream: ReadableStream<Uint8Array> | null; language?: string }
  ) => {
    const path = `${prefix}/${name}`
    console.log(`upload file: ${decodeURIComponent(path)}, size: ${Utils.humanReadableSize(length)}`)

    if (!stream || length <= 0) {
      console.error('File upload failed: stream or length empty', {
        hasStream: !!stream,
        length,
        path,
        timestamp: new Date().toISOString()
      })
      return error(400, t('errors.fileDataError', language))
    }

    // Direct upload to R2 (frontend handles chunking logic)
    return env.R2.put(path, stream, {
      httpMetadata: { contentType: 'application/octet-stream' },
      customMetadata: { uploadedAt: new Date().toISOString() },
    })
      .then(() => newResponse({}))
      .catch((err) => {
        console.error('File upload to R2 failed:', {
          path,
          size: Utils.humanReadableSize(length),
          error: err.message,
          timestamp: new Date().toISOString()
        })
        return error(500, t('errors.fileUploadError', language))
      })
  },

  /**
   * Delete file
   */
  delete: async (env: Env, { prefix, name, language }: { prefix: string; name: string; language?: string }) => {
    const path = `${prefix}/${name}`
    console.log(`delete file: ${path}`)
    return env.R2.delete(path)
      .then(() => newResponse({}))
      .catch((err) => {
        console.error('File deletion from R2 failed:', {
          path,
          error: err.message,
          timestamp: new Date().toISOString()
        })
        return error(500, t('errors.fileDeleteError', language))
      })
  },

  /**
   * List all files under specified prefix
   */
  list: async (env: Env, { prefix, language }: { prefix: string; language?: string }) => {
    try {
      const list = await env.R2.list({ prefix: prefix })
      const data = list.objects.map((obj: R2Object) => ({
        name: decodeURIComponent(obj.key.replace(prefix + '/', '')),
        size: obj.size,
        uploaded: obj.uploaded,
        etag: obj.etag,
      }))
      return newResponse({ data })
        } catch (err: any) {
      console.error('List files from R2 failed:', {
        prefix,
        error: err?.message || err,
        timestamp: new Date().toISOString()
      })
      return error(500, t('errors.fileListError', language))
    }
  },

  /**
   * Delete all files under specified prefix (recursive folder deletion)
   */
  deleteFolder: async (env: Env, { prefix }: { prefix: string }): Promise<number> => {
    let deletedCount = 0
    let cursor: string | undefined

    try {
      do {
        // List files with pagination support
        const listResult = await env.R2.list({
          prefix: prefix,
          cursor: cursor,
          limit: 1000, // R2 returns max 1000 objects per request
        })

        if (listResult.objects.length === 0) {
          break
        }

        // Batch delete files
        const deletePromises = listResult.objects.map((obj: any) => env.R2.delete(obj.key))

        await Promise.all(deletePromises)
        deletedCount += listResult.objects.length

        console.log(
          `Deleted ${listResult.objects.length} files from ${prefix}, total: ${deletedCount}`
        )

        // Get cursor for next batch
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
   * Batch delete files
   */
  batchDelete: async (env: Env, keys: string[]): Promise<number> => {
    if (keys.length === 0) {
      return 0
    }

    try {
      // Concurrent deletion with batch size limit to avoid overload
      const batchSize = 50 // Max 50 files per batch
      let deletedCount = 0

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        const deletePromises = batch.map((key) =>
          env.R2.delete(key).catch((error: any) => {
            console.error(`Failed to delete ${key}`, error)
            return null // Continue deleting other files
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
   * Initialize multipart upload
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
   * Upload part
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
   * Complete multipart upload
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
   * Abort multipart upload
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
