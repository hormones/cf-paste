import {
  StorageAdapter,
  UploadOptions,
  UploadResult,
  DownloadOptions,
  DownloadResult,
  DeleteOptions,
  DeleteResult,
  ListOptions,
  ListResult,
  DeleteFolderOptions,
  DeleteFolderResult,
  CreateMultipartUploadOptions,
  CreateMultipartUploadResult,
  UploadPartOptions,
  UploadPartResult,
  CompleteMultipartUploadOptions,
  CompleteMultipartUploadResult,
  AbortMultipartUploadOptions,
} from '../../types'
import './worker-configuration.d.ts'

export function createR2Adapter(r2: R2Bucket): StorageAdapter {
  return {
    async upload(options: UploadOptions): Promise<UploadResult> {
      const key = `${options.prefix}/${options.name}`
      const object = await r2.put(key, options.stream, {
        httpMetadata: {
          contentType: 'application/octet-stream',
        },
      })

      return {
        success: true,
        key: object.key,
        etag: object.etag,
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
          text: async () => {
            if (object.body) {
              const reader = object.body.getReader()
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
          },
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
        text: async () => {
          if (object.body) {
            const reader = object.body.getReader()
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
        },
      }
    },

    async delete(options: DeleteOptions): Promise<DeleteResult> {
      const key = `${options.prefix}/${options.name}`
      await r2.delete(key)
      return { success: true }
    },

    async list(options: ListOptions): Promise<ListResult> {
      const result = await r2.list({
        prefix: options.prefix,
        limit: 1000,
      })

      return {
        files: result.objects.map((obj) => ({
          name: obj.key.replace(`${options.prefix}/`, ''),
          size: obj.size,
          lastModified: obj.uploaded,
        })),
      }
    },

    async deleteFolder(options: DeleteFolderOptions): Promise<DeleteFolderResult> {
      const result = await r2.list({
        prefix: options.prefix,
      })

      let deletedCount = 0
      for (const obj of result.objects) {
        await r2.delete(obj.key)
        deletedCount++
      }

      return { deletedCount }
    },

    async createMultipartUpload(
      options: CreateMultipartUploadOptions
    ): Promise<CreateMultipartUploadResult> {
      const key = `${options.prefix}/${options.name}`
      const multipartUpload = await r2.createMultipartUpload(key)
      return {
        uploadId: multipartUpload.uploadId,
        key: multipartUpload.key,
      }
    },

    async uploadPart(options: UploadPartOptions): Promise<UploadPartResult> {
      // R2 multipart upload requires the multipart upload object
      // This would need to be implemented with proper multipart upload context
      throw new Error(
        'Multipart upload not implemented in this adapter - requires multipart upload context'
      )
    },

    async completeMultipartUpload(
      options: CompleteMultipartUploadOptions
    ): Promise<CompleteMultipartUploadResult> {
      // R2 multipart upload requires the multipart upload object
      // This would need to be implemented with proper multipart upload context
      throw new Error(
        'Multipart upload not implemented in this adapter - requires multipart upload context'
      )
    },

    async abortMultipartUpload(options: AbortMultipartUploadOptions): Promise<void> {
      // R2 multipart upload requires the multipart upload object
      // This would need to be implemented with proper multipart upload context
      throw new Error(
        'Multipart upload not implemented in this adapter - requires multipart upload context'
      )
    },
  }
}
