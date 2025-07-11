import { AutoRouter } from 'itty-router'
import { R2 } from '../bindings/r2'
import { Constant } from '../constant'
import { newResponse } from '../utils/response'
import { error } from 'itty-router'

const word_router = AutoRouter({ base: '/api/:word/file' })
const view_router = AutoRouter({ base: '/api/v/:view_word/file' })

/**
 * List all files under specified prefix
 */
word_router.get('/list', async (req: IRequest, env) => request4List(env, req))
view_router.get('/list', async (req: IRequest, env) => request4List(env, req))
const request4List = async (env: Env, req: IRequest) => {
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  return R2.list(env, { prefix, language: req.language })
}

/**
 * Download specified file
 */
word_router.get('/download', async (req: IRequest, env: Env) => request4Download(env, req))
view_router.get('/download', async (req: IRequest, env: Env) => request4Download(env, req))
const request4Download = async (env: Env, req: IRequest) => {
  const url = new URL(req.url)
  const fileName = url.searchParams.get('name')
  if (!fileName) {
    return error(400, req.t('errors.invalidRequest'))
  }

  const prefix = `${req.word}/${Constant.FILE_FOLDER}`

  // Call R2.download with resumable download support
  return R2.download(env, req, { prefix, name: fileName })
}

/**
 * Upload file
 */
word_router.post('', async (req: IRequest, env) => request4Upload(env, req))
const request4Upload = async (env: Env, req: IRequest) => {
  const url = new URL(req.url)
  const name = url.searchParams.get('name')
  if (!name) {
    return error(400, req.t('errors.invalidRequest'))
  }
  // Filename from URL parameter is encoded, needs manual decoding
  const decodedName = decodeURIComponent(name)
  const length = req.headers.get('content-length')
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  return R2.upload(env, {
    prefix,
    name: decodedName,
    length: Number(length),
    stream: req.body as unknown as ReadableStream<Uint8Array>,
    language: req.language,
  })
}

/**
 * Delete all files (one-click delete)
 */
word_router.delete('/all', async (req: IRequest, env) => request4DeleteAll(env, req))
const request4DeleteAll = async (env: Env, req: IRequest) => {
  try {
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`

    // Use R2's deleteFolder method to batch delete all files
    const deletedCount = await R2.deleteFolder(env, { prefix })

    return newResponse({
      data: {
        deletedCount,
        message: `Successfully deleted ${deletedCount} files`,
      },
    })
  } catch (err) {
    console.error('Batch file deletion failed', err)
    return error(500, req.t('errors.fileDeleteError'))
  }
}

/**
 * Delete specified file
 */
word_router.delete('', async (req: IRequest, env) => request4Delete(env, req))
const request4Delete = async (env: Env, req: IRequest) => {
  const url = new URL(req.url)
  const name = url.searchParams.get('name')
  if (!name) {
    return error(400, req.t('errors.invalidRequest'))
  }
  // Filename from URL parameter is encoded, needs manual decoding
  const decodedName = decodeURIComponent(name)
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  console.log('delete file: ', decodedName, prefix)
  return R2.delete(env, { prefix, name: decodedName, language: req.language })
}

// === Multipart upload related APIs ===

/**
 * Initialize multipart upload
 */
word_router.post('/multipart/init', async (req: IRequest, env: Env) =>
  request4MultipartInit(env, req)
)
const request4MultipartInit = async (env: Env, req: IRequest) => {
  try {
    const { filename, fileSize, chunkSize } = (await req.json()) as {
      filename: string
      fileSize: number
      chunkSize: number
    }

    // Parameter validation
    if (!filename || !fileSize || !chunkSize) {
      return error(400, req.t('errors.invalidRequest'))
    }

    // File size validation
    const maxFileSize = parseInt(env.MAX_FILE_SIZE || '300') * 1024 * 1024
    if (fileSize > maxFileSize) {
      return error(400, req.t('errors.fileTooLarge'))
    }

    // Use original filename directly
    const uniqueFilename = filename
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`

    // Initialize R2 multipart upload
    const result = await R2.createMultipartUpload(env, {
      prefix,
      name: uniqueFilename,
    })

    const totalChunks = Math.ceil(fileSize / chunkSize)

    return newResponse({
      data: {
        uploadId: result.uploadId,
        fileKey: result.key,
        originalFilename: filename,
        uniqueFilename,
        totalChunks,
        chunkSize,
        fileSize,
      },
    })
  } catch (err) {
    console.error('Failed to initialize multipart upload', err)
    return error(500, req.t('errors.fileUploadError'))
  }
}

/**
 * Cancel multipart upload
 */
word_router.delete('/multipart/cancel/:uploadId', async (req: IRequest, env: Env) =>
  request4MultipartCancel(env, req)
)
const request4MultipartCancel = async (env: Env, req: IRequest) => {
  try {
    const { uploadId } = req.params
    const { fileKey } = await req.json<{ fileKey: string }>()

    if (!uploadId || !fileKey) {
      return error(400, req.t('errors.invalidRequest'))
    }

    // Call R2's abortMultipartUpload
    await R2.abortMultipartUpload(env, { uploadId, key: fileKey })

    return newResponse({
      data: { message: 'Upload cancelled' },
    })
  } catch (err) {
    console.error('Failed to cancel multipart upload', err)
    return error(500, req.t('errors.fileUploadError'))
  }
}

/**
 * Upload single chunk
 */
word_router.post('/multipart/chunk/:uploadId/:chunkIndex', async (req: IRequest, env: Env) =>
  request4MultipartChunk(env, req)
)
const request4MultipartChunk = async (env: Env, req: IRequest) => {
  try {
    const { uploadId, chunkIndex } = req.params
    const partNumber = parseInt(chunkIndex) + 1 // R2 partNumber starts from 1

    if (!uploadId || !partNumber || partNumber < 1) {
      return error(400, req.t('errors.invalidRequest'))
    }

    // Get fileKey from request header and decode
    const encodedFileKey = req.headers.get('X-File-Key')
    if (!encodedFileKey) {
      return error(400, req.t('errors.fileDataError'))
    }
    const fileKey = decodeURIComponent(encodedFileKey)

    // Get chunk data
    const chunkData = await req.arrayBuffer()
    if (!chunkData || chunkData.byteLength === 0) {
      return error(400, req.t('errors.fileDataError'))
    }

    // Upload chunk to R2
    const result = await R2.uploadPart(env, {
      uploadId,
      key: fileKey,
      partNumber,
      data: chunkData,
    })

    return newResponse({
      data: {
        partNumber: result.partNumber,
        etag: result.etag,
        size: chunkData.byteLength,
      },
    })
  } catch (err) {
    console.error('Chunk upload failed', err)
    return error(500, req.t('errors.fileUploadError'))
  }
}

/**
 * Complete multipart upload
 */
word_router.post('/multipart/complete/:uploadId', async (req: IRequest, env: Env) =>
  request4MultipartComplete(env, req)
)
const request4MultipartComplete = async (env: Env, req: IRequest) => {
  try {
    const { uploadId } = req.params
    const { fileKey, parts } = (await req.json()) as {
      fileKey: string
      parts: Array<{ partNumber: number; etag: string }>
    }

    if (!uploadId || !fileKey || !parts || !Array.isArray(parts)) {
      return error(400, req.t('errors.invalidRequest'))
    }

    // Validate chunk integrity
    const sortedParts = parts
      .map((part) => ({
        partNumber: part.partNumber,
        etag: part.etag,
      }))
      .sort((a, b) => a.partNumber - b.partNumber)

    // Check chunk sequence continuity
    for (let i = 0; i < sortedParts.length; i++) {
      if (sortedParts[i].partNumber !== i + 1) {
        return error(400, req.t('errors.fileUploadError'))
      }
    }

    // Complete R2 multipart upload
    const result = await R2.completeMultipartUpload(env, { uploadId, key: fileKey, parts })

    // Extract filename info from fileKey
    const pathParts = fileKey.split('/')
    const uniqueFilename = pathParts[pathParts.length - 1]
    const originalFilename = uniqueFilename.substring(
      uniqueFilename.indexOf('-', uniqueFilename.indexOf('-') + 1) + 1
    )

    return newResponse({
      data: {
        fileKey,
        originalFilename,
        uniqueFilename,
        etag: result.etag,
        size: result.size,
        uploadId,
        message: 'File upload completed',
      },
    })
  } catch (err) {
    console.error('Failed to complete multipart upload', err)
    return error(500, req.t('errors.fileUploadError'))
  }
}

export { word_router, view_router }
