import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { Readable } from 'stream'
import { StorageAdapter, UploadOptions, UploadResult, DownloadOptions, DownloadResult, DeleteOptions, DeleteResult, ListOptions, ListResult, DeleteFolderOptions, DeleteFolderResult, CreateMultipartUploadOptions, CreateMultipartUploadResult, UploadPartOptions, UploadPartResult, CompleteMultipartUploadOptions, CompleteMultipartUploadResult, AbortMultipartUploadOptions } from '../../types'

export function createLocalStorageAdapter(storagePath: string): StorageAdapter {
  const ensureDir = async (path: string) => {
    try {
      await fs.access(path)
    } catch {
      await fs.mkdir(path, { recursive: true })
    }
  }

  const bufferToStream = (buffer: Buffer): ReadableStream<Uint8Array> => {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(buffer)
        controller.close()
      }
    })
  }

    const streamToBuffer = async (stream: any): Promise<Buffer> => {
    console.log('Stream type:', typeof stream)
    console.log('Stream constructor:', stream?.constructor?.name)

    // Handle Buffer directly (most common case for Node.js)
    if (Buffer.isBuffer(stream)) {
      return stream
    }

    // Handle Node.js Readable stream
    if (stream && typeof stream.pipe === 'function') {
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
      })
    }

    // Handle standard ReadableStream
    if (stream && typeof stream.getReader === 'function') {
      const reader = stream.getReader()
      const chunks: Uint8Array[] = []

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
        }
      } finally {
        reader.releaseLock()
      }

      const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
      return buffer
    }

    // Handle ArrayBuffer
    if (stream instanceof ArrayBuffer) {
      return Buffer.from(stream)
    }

    // Handle Uint8Array
    if (stream instanceof Uint8Array) {
      return Buffer.from(stream)
    }

    // Handle string
    if (typeof stream === 'string') {
      return Buffer.from(stream, 'utf8')
    }

    // Handle object with toString method
    if (stream && typeof stream.toString === 'function') {
      return Buffer.from(stream.toString(), 'utf8')
    }

    // Handle null or undefined
    if (stream == null) {
      return Buffer.alloc(0)
    }

    throw new Error(`Unsupported stream type: ${typeof stream}, constructor: ${stream?.constructor?.name}`)
  }

  return {
    async upload(options: UploadOptions): Promise<UploadResult> {
      const filePath = join(storagePath, options.prefix, options.name)
      await ensureDir(dirname(filePath))

      const buffer = await streamToBuffer(options.stream)
      await fs.writeFile(filePath, buffer)

      return {
        success: true,
        key: `${options.prefix}/${options.name}`
      }
    },

    async download(options: DownloadOptions): Promise<DownloadResult> {
      const filePath = join(storagePath, options.prefix, options.name)

      try {
        const stats = await fs.stat(filePath)
        const totalSize = stats.size

        if (options.range) {
          // Handle range request for resumable download
          const { start, end } = options.range

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

          const buffer = await fs.readFile(filePath)
          const rangeBuffer = buffer.slice(start, end + 1)

          const headers = new Headers()
          headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`)
          headers.set('Content-Length', (end - start + 1).toString())
          headers.set('Accept-Ranges', 'bytes')
          headers.set('Content-Type', 'application/octet-stream')

          return {
            status: 206,
            headers,
            body: bufferToStream(rangeBuffer),
            text: async () => rangeBuffer.toString('utf-8')
          }
        }

        // Full file download
        const buffer = await fs.readFile(filePath)

        const headers = new Headers()
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Content-Type', 'application/octet-stream')
        headers.set('Content-Length', stats.size.toString())

        return {
          status: 200,
          headers,
          body: bufferToStream(buffer),
          text: async () => buffer.toString('utf-8')
        }
      } catch (error) {
        return {
          status: 404,
          headers: new Headers(),
          body: new ReadableStream(),
          text: async () => ''
        }
      }
    },

    async delete(options: DeleteOptions): Promise<DeleteResult> {
      const filePath = join(storagePath, options.prefix, options.name)

      try {
        await fs.unlink(filePath)
        return { success: true }
      } catch {
        return { success: false }
      }
    },

    async list(options: ListOptions): Promise<ListResult> {
      const dirPath = join(storagePath, options.prefix)

      try {
        const files = await fs.readdir(dirPath, { withFileTypes: true })
        const fileList = []

        for (const file of files) {
          if (file.isFile()) {
            const filePath = join(dirPath, file.name)
            const stats = await fs.stat(filePath)

            fileList.push({
              name: file.name,
              size: stats.size,
              lastModified: stats.mtime
            })
          }
        }

        return { files: fileList }
      } catch {
        return { files: [] }
      }
    },

    async deleteFolder(options: DeleteFolderOptions): Promise<DeleteFolderResult> {
      const dirPath = join(storagePath, options.prefix)

      try {
        const files = await fs.readdir(dirPath, { withFileTypes: true })
        let deletedCount = 0

        for (const file of files) {
          if (file.isFile()) {
            const filePath = join(dirPath, file.name)
            await fs.unlink(filePath)
            deletedCount++
          }
        }

        await fs.rmdir(dirPath)
        return { deletedCount }
      } catch {
        return { deletedCount: 0 }
      }
    },

    async createMultipartUpload(options: CreateMultipartUploadOptions): Promise<CreateMultipartUploadResult> {
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const uploadDir = join(storagePath, 'uploads', uploadId)

      await ensureDir(uploadDir)
      await fs.writeFile(join(uploadDir, 'metadata.json'), JSON.stringify({
        key: `${options.prefix}/${options.name}`,
        uploadId,
        createdAt: new Date().toISOString()
      }))

      return {
        uploadId,
        key: `${options.prefix}/${options.name}`
      }
    },

    async uploadPart(options: UploadPartOptions): Promise<UploadPartResult> {
      const uploadDir = join(storagePath, 'uploads', options.uploadId)
      const partPath = join(uploadDir, `part_${options.partNumber}`)

      const buffer = Buffer.from(options.data)
      await fs.writeFile(partPath, buffer)

      return {
        partNumber: options.partNumber,
        etag: `etag_${options.partNumber}_${Date.now()}`
      }
    },

    async completeMultipartUpload(options: CompleteMultipartUploadOptions): Promise<CompleteMultipartUploadResult> {
      const uploadDir = join(storagePath, 'uploads', options.uploadId)
      const metadataPath = join(uploadDir, 'metadata.json')

      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
      const filePath = join(storagePath, metadata.key)

      await ensureDir(dirname(filePath))

      const parts = options.parts.sort((a, b) => a.partNumber - b.partNumber)
      const buffers: Buffer[] = []

      for (const part of parts) {
        const partPath = join(uploadDir, `part_${part.partNumber}`)
        const buffer = await fs.readFile(partPath)
        buffers.push(buffer)
      }

      const finalBuffer = Buffer.concat(buffers)
      await fs.writeFile(filePath, finalBuffer)

      await fs.rm(uploadDir, { recursive: true, force: true })

      return {
        success: true,
        etag: `etag_${Date.now()}`
      }
    },

    async abortMultipartUpload(options: AbortMultipartUploadOptions): Promise<void> {
      const uploadDir = join(storagePath, 'uploads', options.uploadId)
      await fs.rm(uploadDir, { recursive: true, force: true })
    }
  }
}
