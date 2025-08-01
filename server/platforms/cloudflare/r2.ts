import {
  AbortMultipartUploadOptions,
  CompleteMultipartUploadOptions,
  CompleteMultipartUploadResult,
  CreateMultipartUploadOptions,
  CreateMultipartUploadResult,
  DeleteFolderOptions,
  DeleteFolderResult,
  DeleteOptions,
  DownloadOptions,
  DownloadResult,
  ListOptions,
  ListResult,
  StorageAdapter,
  UploadOptions,
  UploadPartOptions,
  UploadPartResult,
  UploadResult
} from '../../types'
import './worker-configuration.d.ts'
import { Utils } from '../../utils'

const extractText = async (body: ReadableStream): Promise<string> => {
  if (body) {
    const reader = body.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const combined = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    return new TextDecoder().decode(combined)
  }
  return ''
}

export function createR2Adapter(r2: R2Bucket): StorageAdapter {
  return {
    async upload(options: UploadOptions): Promise<UploadResult> {
      const key = `${options.prefix}/${options.name}`
      console.log(
        `upload file: ${decodeURIComponent(key)}, size: ${Utils.humanReadableSize(options.length)}`
      )

      if (!options.stream || options.length <= 0) {
        throw new Error('file upload failed: stream or length empty')
      }

      // Direct upload to R2 (frontend handles chunking logic)
      const result = await r2.put(key, options.stream, {
        httpMetadata: { contentType: 'application/octet-stream' }
      })

      return {
        key: result.key,
        etag: result.etag
      }
    },

    async download(options: DownloadOptions): Promise<DownloadResult> {
      const key = `${options.prefix}/${options.name}`

      if (options.range) {
        // Handle range request for resumable download
        const objectMeta = await r2.head(key)
        if (!objectMeta) {
          return {
            status: 404,
            headers: new Headers(),
            body: new ReadableStream(),
            text: async () => '',
          }
        }

        const { start, end } = options.range
        const totalSize = objectMeta.size

        if (start >= totalSize || end >= totalSize) {
          const headers = new Headers()
          headers.set('Content-Range', `bytes */${totalSize}`)
          return {
            status: 416,
            headers,
            body: new ReadableStream(),
            text: async () => '',
          }
        }

        const object = await r2.get(key, {
          range: { offset: start, length: end - start + 1 },
        })

        if (!object) {
          return {
            status: 404,
            headers: new Headers(),
            body: new ReadableStream(),
            text: async () => '',
          }
        }

        const headers = new Headers()
        headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`)
        headers.set('Content-Length', (end - start + 1).toString())
        headers.set('Accept-Ranges', 'bytes')
        object.writeHttpMetadata(headers)
        headers.set('ETag', object.httpEtag)

        return {
          status: 206,
          headers,
          body: object.body || new ReadableStream(),
          text: async () => extractText(object.body),
        }
      }

      // Full file download
      const object = await r2.get(key)

      if (!object) {
        return {
          status: 404,
          headers: new Headers(),
          body: new ReadableStream(),
          text: async () => '',
        }
      }

      const headers = new Headers()
      headers.set('Accept-Ranges', 'bytes')
      if (object.httpMetadata?.contentType) {
        headers.set('Content-Type', object.httpMetadata.contentType)
      }
      headers.set('Content-Length', object.size.toString())
      headers.set('ETag', object.etag)

      return {
        status: 200,
        headers,
        body: object.body || new ReadableStream(),
        text: async () => extractText(object.body),
      }
    },

    async delete(options: DeleteOptions): Promise<void> {
      const key = `${options.prefix}/${options.name}`
      console.log(`delete file: ${key}`)
      await r2.delete(key)
    },

    async list(options: ListOptions): Promise<ListResult> {
      const result = await r2.list({
        prefix: options.prefix,
        limit: 1000
      })

      return {
        files: result.objects.map((obj) => ({
          name: decodeURIComponent(obj.key.replace(options.prefix + '/', '')),
          size: obj.size,
          lastModified: obj.uploaded.getTime(),
          etag: obj.etag
        }))
      }
    },

    async deleteFolder(options: DeleteFolderOptions): Promise<DeleteFolderResult> {
      let deletedCount = 0
      let cursor: string | undefined

      try {
        do {
          // List files with pagination support
          const listResult = await r2.list({
            prefix: options.prefix,
            cursor: cursor,
            limit: 1000 // R2 returns max 1000 objects per request
          })

          if (listResult.objects.length === 0) {
            break
          }

          // Batch delete files
          const deletePromises = listResult.objects.map((obj: any) => r2.delete(obj.key))

          await Promise.all(deletePromises)
          deletedCount += listResult.objects.length

          console.log(
            `Deleted ${listResult.objects.length} files from ${options.prefix}, total: ${deletedCount}`
          )

          // Get cursor for next batch
          if (listResult.truncated && listResult.objects.length > 0) {
            cursor = listResult.objects[listResult.objects.length - 1].key
          } else {
            break
          }
        } while (cursor)

        console.log(`Folder deletion completed: ${options.prefix}, total deleted: ${deletedCount}`)
        return { deletedCount }
      } catch (err) {
        console.error(`Failed to delete folder ${options.prefix}`, err)
        throw err
      }
    },

    async createMultipartUpload(
      options: CreateMultipartUploadOptions
    ): Promise<CreateMultipartUploadResult> {
      const key = `${options.prefix}/${options.name}`
      console.log(`create multipart upload: ${key}`)

      try {
        const multipartUpload = await r2.createMultipartUpload(key, {
          httpMetadata: { contentType: 'application/octet-stream' },
          customMetadata: { uploadedAt: new Date().toISOString() }
        })

        return {
          uploadId: multipartUpload.uploadId,
          key: multipartUpload.key
        }
      } catch (error) {
        console.error(`Failed to create multipart upload for ${key}`, error)
        throw error
      }
    },

    async uploadPart(options: UploadPartOptions): Promise<UploadPartResult> {
      const data = options.data as ArrayBuffer

      console.log(
        `upload part ${options.partNumber} for ${options.key}, size: ${Utils.humanReadableSize(data.byteLength)}`
      )

      try {
        const multipartUpload = await r2.resumeMultipartUpload(options.key, options.uploadId)
        const uploadedPart = await multipartUpload.uploadPart(options.partNumber, data)

        return {
          partNumber: options.partNumber,
          etag: uploadedPart.etag
        }
      } catch (error) {
        console.error(`Failed to upload part ${options.partNumber} for ${options.key}`, error)
        throw error
      }
    },

    async completeMultipartUpload(
      options: CompleteMultipartUploadOptions
    ): Promise<CompleteMultipartUploadResult> {
      console.log(`complete multipart upload for ${options.key}, parts: ${options.parts.length}`)

      try {
        const multipartUpload = await r2.resumeMultipartUpload(options.key, options.uploadId)
        const result = await multipartUpload.complete(options.parts)

        return {
          success: true,
          etag: result.etag
          // size: result.size,
        }
      } catch (error) {
        console.error(`Failed to complete multipart upload for ${options.key}`, error)
        throw error
      }
    },

    async abortMultipartUpload(options: AbortMultipartUploadOptions): Promise<void> {
      console.log(`abort multipart upload for ${options.key}`)

      try {
        const multipartUpload = await r2.resumeMultipartUpload(options.key, options.uploadId)
        await multipartUpload.abort()
      } catch (error) {
        console.error(`Failed to abort multipart upload for ${options.key}`, error)
        throw error
      }
    },
  }
}
