import { promises as fs, createReadStream, createWriteStream } from 'fs'
import { dirname, join } from 'path'
import { pipeline } from 'stream/promises'
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
  UploadResult,
} from '../../types'
import { Utils } from '../../utils'

const METADATA_SUFFIX = '.meta.json'

const ensureDir = async (path: string) => {
  try {
    await fs.access(path)
  } catch {
    await fs.mkdir(path, { recursive: true })
  }
}

const getMetadataPath = (filePath: string) => `${filePath}${METADATA_SUFFIX}`

const writeMetadata = async (filePath: string, metadata: { contentType?: string }) => {
  const metadataPath = getMetadataPath(filePath)
  const contentType = metadata.contentType || Utils.detectMimeType(filePath)
  const payload = JSON.stringify({
    contentType,
    updatedAt: new Date().toISOString(),
  })
  await fs.writeFile(metadataPath, payload)
}

const readMetadata = async (
  filePath: string
): Promise<{ contentType?: string }> => {
  try {
    const metadataRaw = await fs.readFile(getMetadataPath(filePath), 'utf-8')
    const metadata = JSON.parse(metadataRaw)
    if (metadata && typeof metadata.contentType === 'string') {
      return { contentType: metadata.contentType }
    }
  } catch {
    // ignore missing metadata
  }
  return {}
}

const removeMetadata = async (filePath: string) => {
  try {
    await fs.rm(getMetadataPath(filePath), { force: true })
  } catch {
    // ignore remove error
  }
}

const streamToBuffer = async (stream: any): Promise<Buffer> => {
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

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
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

  throw new Error(
    `Unsupported stream type: ${typeof stream}, constructor: ${stream?.constructor?.name}`
  )
}

export function createLocalStorageAdapter(storagePath: string): StorageAdapter {
  return {
    async upload(options: UploadOptions): Promise<UploadResult> {
      const filePath = join(storagePath, options.prefix, options.name)
      await ensureDir(dirname(filePath))
      const contentType = options.contentType || Utils.detectMimeType(options.name)

      // 使用流式写入，避免将整个文件加载到内存
      if (options.stream && typeof (options.stream as any).pipe === 'function') {
        // Node.js ReadableStream - 真正的流式处理
        const readableStream = options.stream as NodeJS.ReadableStream
        const writeStream = createWriteStream(filePath)

        return new Promise((resolve, reject) => {
          writeStream.on('error', reject)
          readableStream.on('error', reject)

          writeStream.on('finish', async () => {
            try {
              await writeMetadata(filePath, { contentType })
            } catch (metadataError) {
              console.error('Failed to write metadata:', metadataError)
            }
            resolve({
              key: `${options.prefix}/${options.name}`,
            })
          })

          // 流式复制，支持背压控制
          readableStream.pipe(writeStream)
        })
      } else {
        // 对于其他类型（Buffer、ArrayBuffer等），保持原有逻辑
        const buffer = await streamToBuffer(options.stream)
        await fs.writeFile(filePath, buffer)
        try {
          await writeMetadata(filePath, { contentType })
        } catch (metadataError) {
          console.error('Failed to write metadata:', metadataError)
        }

        return {
          key: `${options.prefix}/${options.name}`,
        }
      }
    },

    async download(options: DownloadOptions): Promise<DownloadResult> {
      const decodedName = decodeURIComponent(options.name)
      const filePath = join(storagePath, options.prefix, decodedName)

      // Check if file exists first to avoid unnecessary error logging
      try {
        await fs.access(filePath)
      } catch {
        // File doesn't exist - this is a normal case (e.g., paste with only files, no text content)
        return {
          status: 404,
          headers: new Headers(),
          body: new ReadableStream(),
          text: async () => '',
        }
      }

      try {
        const stats = await fs.stat(filePath)
        const totalSize = stats.size
        const metadata = await readMetadata(filePath)
        const resolvedContentType =
          metadata.contentType || Utils.detectMimeType(decodedName)

        if (options.range) {
          // Handle range request for resumable download
          let { start, end } = options.range

          // If end was set to a very large number (from parseRange with unknown size), adjust it
          if (end === Number.MAX_SAFE_INTEGER - 1) {
            end = totalSize - 1
          }

          // Validate range
          if (
            start < 0 ||
            start >= totalSize ||
            (end !== undefined && end >= totalSize) ||
            (end !== undefined && start > end)
          ) {
            const headers = new Headers()
            headers.set('Content-Range', `bytes */${totalSize}`)
            return {
              status: 416,
              headers,
              body: new ReadableStream(),
              text: async () => '',
            }
          }

          // Calculate actual end position
          const actualEnd = end !== undefined ? Math.min(end, totalSize - 1) : totalSize - 1
          const contentLength = actualEnd - start + 1

          // Create streaming response for range request
          const headers = new Headers()
          headers.set('Content-Range', `bytes ${start}-${actualEnd}/${totalSize}`)
          headers.set('Content-Length', contentLength.toString())
          headers.set('Accept-Ranges', 'bytes')
          headers.set('Content-Type', resolvedContentType)
          headers.set('Content-Disposition', Utils.buildContentDisposition(decodedName))

          // Use streaming for better memory efficiency
          const body = new ReadableStream<Uint8Array>({
            async start(controller) {
              try {
                const stream = createReadStream(filePath, { start, end: actualEnd })

                stream.on('data', (chunk: string | Buffer) => {
                  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
                  controller.enqueue(new Uint8Array(buffer))
                })

                stream.on('end', () => {
                  controller.close()
                })

                stream.on('error', (error) => {
                  console.error('Stream error:', error)
                  controller.error(error)
                })
              } catch (error) {
                controller.error(error)
              }
            },
          })

          return {
            status: 206,
            headers,
            body,
            text: async () => {
              // 使用流式读取指定范围，避免读取整个文件
              const stream = createReadStream(filePath, { start, end: actualEnd })
              const chunks: Buffer[] = []

              for await (const chunk of stream) {
                chunks.push(chunk)
              }

              return Buffer.concat(chunks).toString('utf-8')
            },
          }
        }

        // Full file download with streaming
        const headers = new Headers()
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Content-Type', resolvedContentType)
        headers.set('Content-Length', stats.size.toString())
        headers.set('Content-Disposition', Utils.buildContentDisposition(decodedName))

        // Use streaming for better memory efficiency
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              const stream = createReadStream(filePath)

              stream.on('data', (chunk: string | Buffer) => {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
                controller.enqueue(new Uint8Array(buffer))
              })

              stream.on('end', () => {
                controller.close()
              })

              stream.on('error', (error) => {
                console.error('Stream error:', error)
                controller.error(error)
              })
            } catch (error) {
              controller.error(error)
            }
          },
        })

        return {
          status: 200,
          headers,
          body,
          text: async () => {
            const stream = createReadStream(filePath)
            const chunks: Buffer[] = []

            for await (const chunk of stream) {
              chunks.push(chunk)
            }

            return Buffer.concat(chunks).toString('utf-8')
          },
        }
      } catch (error) {
        // Log error only when it's an actual read/stream error, not a missing file
        console.error('File read error for', filePath, error)
        return {
          status: 500,
          headers: new Headers(),
          body: new ReadableStream(),
          text: async () => '',
        }
      }
    },

    async delete(options: DeleteOptions): Promise<void> {
      const filePath = join(storagePath, options.prefix, options.name)
      // delete file if exists
      if (await fs.access(filePath).then(() => true).catch(() => false)) {
        await fs.unlink(filePath)
        await removeMetadata(filePath)
      }
    },

    async list(options: ListOptions): Promise<ListResult> {
      const dirPath = join(storagePath, options.prefix)

      try {
        const files = await fs.readdir(dirPath, { withFileTypes: true })
        const fileList = []

        for (const file of files) {
          if (file.name.endsWith(METADATA_SUFFIX)) {
            continue
          }
          if (file.isFile()) {
            const filePath = join(dirPath, file.name)
            const stats = await fs.stat(filePath)
            const metadata = await readMetadata(filePath)

            fileList.push({
              name: file.name,
              size: stats.size,
              lastModified: stats.mtime.getTime(),
              contentType: metadata.contentType || Utils.detectMimeType(file.name),
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
            if (file.name.endsWith(METADATA_SUFFIX)) {
              await fs.unlink(filePath)
              continue
            }
            await fs.unlink(filePath)
            await removeMetadata(filePath)
            deletedCount++
          }
        }

        await fs.rm(dirPath, { recursive: true, force: true })
        return { deletedCount }
      } catch {
        return { deletedCount: 0 }
      }
    },

    async createMultipartUpload(
      options: CreateMultipartUploadOptions
    ): Promise<CreateMultipartUploadResult> {
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const uploadDir = join(storagePath, 'uploads', uploadId)

      await ensureDir(uploadDir)
      await fs.writeFile(
        join(uploadDir, 'metadata.json'),
        JSON.stringify({
          key: `${options.prefix}/${options.name}`,
          uploadId,
          createdAt: new Date().toISOString(),
          contentType: options.contentType || Utils.detectMimeType(options.name),
        })
      )

      return {
        uploadId,
        key: `${options.prefix}/${options.name}`,
      }
    },

    async uploadPart(options: UploadPartOptions): Promise<UploadPartResult> {
      const uploadDir = join(storagePath, 'uploads', options.uploadId)
      const partPath = join(uploadDir, `part_${options.partNumber}`)

      // Handle different data types with streaming support
      if (options.data instanceof ArrayBuffer) {
        // ArrayBuffer - direct write
        const buffer = Buffer.from(options.data)
        await fs.writeFile(partPath, buffer)
      } else if (Buffer.isBuffer(options.data)) {
        // Buffer - direct write
        await fs.writeFile(partPath, options.data)
      } else if (options.data && typeof (options.data as any).getReader === 'function') {
        // Web API ReadableStream - stream to file
        const stream = options.data as ReadableStream
        const reader = stream.getReader()
        const writeStream = await fs.open(partPath, 'w')

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            await writeStream.write(Buffer.from(value))
          }
        } finally {
          reader.releaseLock()
          await writeStream.close()
        }
      } else if (options.data && typeof (options.data as any).pipe === 'function') {
        // Node.js ReadableStream - true streaming with backpressure support
        const nodeStream = options.data as NodeJS.ReadableStream

        return new Promise((resolve, reject) => {
          const writeStream = createWriteStream(partPath)

          // Handle stream errors
          writeStream.on('error', reject)
          nodeStream.on('error', reject)

          // Handle successful completion
          writeStream.on('finish', () => {
            resolve({
              partNumber: options.partNumber,
              etag: `etag_${options.partNumber}_${Date.now()}`,
            })
          })

          // Pipe with automatic backpressure handling
          nodeStream.pipe(writeStream)
        })
      } else {
        throw new Error(`Unsupported data type for uploadPart: ${typeof options.data}`)
      }

      return {
        partNumber: options.partNumber,
        etag: `etag_${options.partNumber}_${Date.now()}`,
      }
    },

    async completeMultipartUpload(
      options: CompleteMultipartUploadOptions
    ): Promise<CompleteMultipartUploadResult> {
      const uploadDir = join(storagePath, 'uploads', options.uploadId)
      const metadataPath = join(uploadDir, 'metadata.json')

      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
      const filePath = join(storagePath, metadata.key)
      const contentType = metadata.contentType as string | undefined

      await ensureDir(dirname(filePath))

      const parts = options.parts.sort((a, b) => a.partNumber - b.partNumber)

      // 使用流式合并，避免将所有分片同时加载到内存
      const writeStream = createWriteStream(filePath)

      try {
        // 逐个流式合并分片，内存使用恒定
        for (const part of parts) {
          const partPath = join(uploadDir, `part_${part.partNumber}`)

          // 检查分片文件是否存在
          try {
            await fs.access(partPath)
          } catch (error) {
            writeStream.destroy()
            throw new Error(`Part ${part.partNumber} not found: ${partPath}`)
          }

          const readStream = createReadStream(partPath)

          // 使用 pipeline 进行流式复制，支持背压控制
          await pipeline(readStream, writeStream, { end: false })
        }

        // 完成写入
        writeStream.end()

        // 等待写入完成
        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', resolve)
          writeStream.on('error', reject)
        })
      } catch (error) {
        // 确保在出错时清理资源
        writeStream.destroy()

        // 如果合并失败，删除可能的部分文件
        try {
          await fs.unlink(filePath)
        } catch {
          // 忽略删除失败的错误
        }

        console.error('Multipart upload completion failed:', error)
        throw error
      }

      // 清理临时文件和目录
      await fs.rm(uploadDir, { recursive: true, force: true })
      try {
        await writeMetadata(filePath, {
          contentType: contentType || Utils.detectMimeType(metadata.key.split('/').pop() || ''),
        })
      } catch (metadataError) {
        console.error('Failed to write metadata after multipart completion:', metadataError)
      }

      return {
        success: true,
        etag: `etag_${Date.now()}`,
      }
    },

    async abortMultipartUpload(options: AbortMultipartUploadOptions): Promise<void> {
      const uploadDir = join(storagePath, 'uploads', options.uploadId)
      await fs.rm(uploadDir, { recursive: true, force: true })
    },
  }
}
