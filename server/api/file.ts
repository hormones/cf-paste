import { IRequest, IContext, ApiResponse } from '../types'
import { Constant } from '../../shared/constants'
import { Utils } from '../utils'

export async function handleFileList(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  const result = await ctx.storage.list({ prefix })

  return {
    code: 0,
    data: result.files,
  }
}

export async function handleFileDownload(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const { name, preview } = req.params || {}
  if (!name) {
    return {
      code: 400,
      msg: req.t('errors.invalidRequest'),
      status: 400,
    }
  }

  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  const range = req.getHeader('range')

  const downloadOptions: any = { prefix, name }

  if (range) {
    // Only forward *closed* ranges. An open-ended range such as `bytes=0-`
    // (which browsers and download managers send constantly) cannot be
    // resolved without knowing the real file size, and guessing
    // Number.MAX_SAFE_INTEGER produces end=9007199254740990. The storage
    // adapters then compare that against the real size, decide the range is
    // unsatisfiable and answer 416 with `Content-Range: bytes */<size>`,
    // which makes the browser report the download as "-1 B" / unknown length.
    // Answering 200 for these requests is both correct and cheaper.
    const rangeInfo = Utils.parseClosedRange(range)
    if (rangeInfo) {
      downloadOptions.range = rangeInfo
    }
  }

  const result = await ctx.storage.download(downloadOptions)

  // For streaming downloads, we need to handle the response differently
  if (result.status === 206 || result.status === 200) {
    const headers: Record<string, string> = {}

    // Copy through the storage headers, dropping any Content-Disposition the
    // adapter may have set. Header names are case-insensitive on the wire, but
    // a plain object is not: keeping a lowercase 'content-disposition' next to
    // our capitalized one emitted two values for the same header.
    for (const [key, value] of result.headers.entries()) {
      if (key.toLowerCase() === 'content-disposition') continue
      headers[key] = value
    }

    // Determine Content-Disposition based on preview parameter
    // Default: attachment (download), preview=true: inline (preview in browser)
    const disposition = preview === 'true' ? 'inline' : 'attachment'
    headers['Content-Disposition'] = Utils.buildContentDisposition(name, disposition)

    // Cloudflare compresses compressible content types (text/*, json, svg, ...)
    // and drops Content-Length when it does, which leaves the download manager
    // without a total size and makes Range/Content-Range disagree with the wire
    // bytes. `no-transform` keeps the payload byte-identical to what the
    // adapter reported.
    headers['Cache-Control'] = 'no-transform'

    // Return the stream directly for efficient streaming
    return {
      code: 0,
      data: result.body,
      status: result.status,
      headers,
      // Add streaming flag to indicate this is a stream response
      streaming: true,
    }
  }

  return {
    code: result.status === 404 ? 404 : 500,
    msg: result.status === 404 ? req.t('errors.fileNotFound') : req.t('errors.downloadError'),
    status: result.status,
    headers: Object.fromEntries(result.headers.entries()),
  }
}

export async function handleFileUpload(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const { name } = req.params || {}
  if (!name) {
    return {
      code: 400,
      msg: req.t('errors.invalidRequest'),
      status: 400,
    }
  }

  const decodedName = decodeURIComponent(name)
  const length = req.getHeader('content-length')
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  const contentType = Utils.detectMimeType(decodedName)

  // For file uploads, use the raw request stream if body is undefined
  const stream =
    req.request.body !== undefined ? req.request.body : (req.request as NodeJS.ReadableStream)

  const result = await ctx.storage.upload({
    prefix,
    name: decodedName,
    length: Number(length),
    stream,
    contentType,
  })

  return {
    code: 0,
    data: result,
  }
}

export async function handleFileDelete(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const { name } = req.params || {}
  if (!name) {
    return {
      code: 400,
      msg: req.t('errors.invalidRequest'),
      status: 400,
    }
  }

  const decodedName = decodeURIComponent(name)
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`

  const result = await ctx.storage.delete({ prefix, name: decodedName })

  return {
    code: 0,
    data: result,
  }
}

export async function handleFileDeleteAll(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`
    const result = await ctx.storage.deleteFolder({ prefix })

    return {
      code: 0,
      data: {
        deletedCount: result.deletedCount,
        message: `Successfully deleted ${result.deletedCount} files`,
      },
    }
  } catch (err) {
    console.error('Batch file deletion failed', err)
    return {
      code: 500,
      msg: req.t('errors.fileDeleteError'),
      status: 500,
    }
  }
}

export async function handleMultipartInit(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const { filename, fileSize, chunkSize } = await req.json()

    if (!filename || !fileSize || !chunkSize) {
      return {
        code: 400,
        msg: req.t('errors.invalidRequest'),
        status: 400,
      }
    }

    const maxFileSize = ctx.config.MAX_FILE_SIZE * 1024 * 1024
    if (fileSize > maxFileSize) {
      return {
        code: 400,
        msg: req.t('errors.fileTooLarge'),
        status: 400,
      }
    }

    const uniqueFilename = filename
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`
    const contentType = Utils.detectMimeType(filename)

    const result = await ctx.storage.createMultipartUpload({
      prefix,
      name: uniqueFilename,
      contentType,
    })

    const totalChunks = Math.ceil(fileSize / chunkSize)

    return {
      code: 0,
      data: {
        uploadId: result.uploadId,
        fileKey: result.key,
        originalFilename: filename,
        uniqueFilename,
        totalChunks,
        chunkSize,
        fileSize,
        contentType,
      },
    }
  } catch (err) {
    console.error('Failed to initialize multipart upload', err)
    return {
      code: 500,
      msg: req.t('errors.fileUploadError'),
      status: 500,
    }
  }
}

export async function handleMultipartCancel(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const { uploadId } = req.variables || {}
    const { fileKey } = await req.json()

    if (!uploadId || !fileKey) {
      return {
        code: 400,
        msg: req.t('errors.invalidRequest'),
        status: 400,
      }
    }

    await ctx.storage.abortMultipartUpload({ uploadId, key: fileKey })

    return {
      code: 0,
      data: { message: 'Upload cancelled' },
    }
  } catch (err) {
    console.error('Failed to cancel multipart upload', err)
    return {
      code: 500,
      msg: req.t('errors.fileUploadError'),
      status: 500,
    }
  }
}

export async function handleMultipartChunk(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const { uploadId, chunkIndex } = req.variables || {}
    const partNumber = parseInt(chunkIndex) + 1

    if (!uploadId || !partNumber || partNumber < 1) {
      return {
        code: 400,
        msg: req.t('errors.invalidRequest'),
        status: 400,
      }
    }

    const encodedFileKey = req.getHeader('X-File-Key')
    if (!encodedFileKey) {
      return {
        code: 400,
        msg: req.t('errors.fileDataError'),
        status: 400,
      }
    }
    const fileKey = decodeURIComponent(encodedFileKey)

    // Use true streaming approach - directly pass the request stream
    const startTime = Date.now()
    const memUsageBefore = process.memoryUsage()
    console.log('Using streaming approach for chunk upload')
    console.log('Content-Length:', req.getHeader('content-length'))
    console.log('Request body parsed:', req.request.body !== undefined)
    console.log('Memory before:', Math.round(memUsageBefore.heapUsed / 1024 / 1024), 'MB')

    const contentLength = parseInt(req.getHeader('content-length') || '0')
    if (contentLength === 0) {
      return {
        code: 400,
        msg: req.t('errors.fileDataError'),
        status: 400,
      }
    }

    let chunkData: ArrayBuffer | ReadableStream | NodeJS.ReadableStream

    if (req.contentType === 'application/octet-stream' && req.request.body === undefined) {
      // True streaming: use the raw request stream
      console.log('✅ Using raw request stream for true streaming')
      chunkData = req.request as NodeJS.ReadableStream
    } else {
      // Body was already parsed or we're on a different platform
      console.log('⚠️  Body was already parsed, falling back to buffer mode')

      if (req.request.body instanceof ArrayBuffer) {
        console.log('✅ Body type : ArrayBuffer')
        chunkData = req.request.body
      } else if (Buffer.isBuffer(req.request.body)) {
        console.log('✅ Body type: Buffer')
        chunkData = req.request.body.buffer.slice(
          req.request.body.byteOffset,
          req.request.body.byteOffset + req.request.body.byteLength
        )
      } else if (req.request.arrayBuffer && typeof req.request.arrayBuffer === 'function') {
        console.log('✅ Body type: ArrayBuffer via arrayBuffer()')
        chunkData = await req.request.arrayBuffer()
      } else {
        console.error('⚠️ Body type: Unknown')
        return {
          code: 400,
          msg: req.t('errors.fileDataError'),
          status: 400,
        }
      }
    }

    const result = await ctx.storage.uploadPart({
      uploadId,
      key: fileKey,
      partNumber,
      data: chunkData,
    })

    // Performance monitoring
    const endTime = Date.now()
    console.log('Chunk upload completed in:', endTime - startTime, 'ms')

    return {
      code: 0,
      data: {
        partNumber: result.partNumber,
        etag: result.etag,
        size: contentLength, // Use content-length since we might be streaming
      },
    }
  } catch (err) {
    console.error('Chunk upload failed', err)
    return {
      code: 500,
      msg: req.t('errors.fileUploadError'),
      status: 500,
    }
  }
}

export async function handleMultipartComplete(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const { uploadId } = req.variables || {}
    const { fileKey, parts } = await req.json()

    if (!uploadId || !fileKey || !parts || !Array.isArray(parts)) {
      return {
        code: 400,
        msg: req.t('errors.invalidRequest'),
        status: 400,
      }
    }

    const sortedParts = parts
      .map((part) => ({
        partNumber: part.partNumber,
        etag: part.etag,
      }))
      .sort((a, b) => a.partNumber - b.partNumber)

    for (let i = 0; i < sortedParts.length; i++) {
      if (sortedParts[i].partNumber !== i + 1) {
        return {
          code: 400,
          msg: req.t('errors.fileUploadError'),
          status: 400,
        }
      }
    }

    const result = await ctx.storage.completeMultipartUpload({
      uploadId,
      key: fileKey,
      parts,
      contentType: Utils.detectMimeType(fileKey.split('/').pop() || ''),
    })

    const pathParts = fileKey.split('/')
    const uniqueFilename = pathParts[pathParts.length - 1]
    const originalFilename = uniqueFilename.substring(
      uniqueFilename.indexOf('-', uniqueFilename.indexOf('-') + 1) + 1
    )

    return {
      code: 0,
      data: {
        fileKey,
        originalFilename,
        uniqueFilename,
        etag: result.etag,
        uploadId,
        message: 'File upload completed',
      },
    }
  } catch (err) {
    console.error('Failed to complete multipart upload', err)
    return {
      code: 500,
      msg: req.t('errors.fileUploadError'),
      status: 500,
    }
  }
}
