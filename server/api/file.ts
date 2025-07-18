import { IRequest, IContext, ApiResponse } from '../types'
import { Constant } from '../../shared/constants'
import { Utils } from '../utils'

export async function handleFileList(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  const result = await ctx.storage.list({ prefix })

  return {
    code: 0,
    data: result.files
  }
}

export async function handleFileDownload(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const url = new URL(req.path)
  const fileName = url.searchParams.get('name')
  if (!fileName) {
    return {
      code: 400,
      msg: req.t('errors.invalidRequest'),
      status: 400
    }
  }

  const prefix = `${req.word}/${Constant.FILE_FOLDER}`
  const range = req.getHeader('range')

  let downloadOptions: any = { prefix, name: fileName }

  if (range) {
    // For range requests, we need to get file metadata first
    // This will be handled by the storage adapter
    const rangeInfo = Utils.parseRange(range, 0) // Size will be determined by storage adapter
    downloadOptions.range = rangeInfo
  }

  const result = await ctx.storage.download(downloadOptions)

  return {
    code: 0,
    data: result,
    status: result.status,
    headers: Object.fromEntries(result.headers.entries())
  }
}

export async function handleFileUpload(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const name = req.params?.name
  if (!name) {
    return {
      code: 400,
      msg: req.t('errors.invalidRequest'),
      status: 400
    }
  }

  const decodedName = decodeURIComponent(name)
  const length = req.getHeader('content-length')
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`

  const result = await ctx.storage.upload({
    prefix,
    name: decodedName,
    length: Number(length),
    stream: req.request.body as ReadableStream<Uint8Array>
  })

  return {
    code: 0,
    data: result
  }
}

export async function handleFileDelete(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  const url = new URL(req.path)
  const name = url.searchParams.get('name')
  if (!name) {
    return {
      code: 400,
      msg: req.t('errors.invalidRequest'),
      status: 400
    }
  }

  const decodedName = decodeURIComponent(name)
  const prefix = `${req.word}/${Constant.FILE_FOLDER}`

  const result = await ctx.storage.delete({ prefix, name: decodedName })

  return {
    code: 0,
    data: result
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
        message: `Successfully deleted ${result.deletedCount} files`
      }
    }
  } catch (err) {
    console.error('Batch file deletion failed', err)
    return {
      code: 500,
      msg: req.t('errors.fileDeleteError'),
      status: 500
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
        status: 400
      }
    }

    const maxFileSize = ctx.config.MAX_FILE_SIZE * 1024 * 1024
    if (fileSize > maxFileSize) {
      return {
        code: 400,
        msg: req.t('errors.fileTooLarge'),
        status: 400
      }
    }

    const uniqueFilename = filename
    const prefix = `${req.word}/${Constant.FILE_FOLDER}`

    const result = await ctx.storage.createMultipartUpload({
      prefix,
      name: uniqueFilename
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
        fileSize
      }
    }
  } catch (err) {
    console.error('Failed to initialize multipart upload', err)
    return {
      code: 500,
      msg: req.t('errors.fileUploadError'),
      status: 500
    }
  }
}

export async function handleMultipartCancel(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const { uploadId } = req.params || {}
    const { fileKey } = await req.json()

    if (!uploadId || !fileKey) {
      return {
        code: 400,
        msg: req.t('errors.invalidRequest'),
        status: 400
      }
    }

    await ctx.storage.abortMultipartUpload({ uploadId, key: fileKey })

    return {
      code: 0,
      data: { message: 'Upload cancelled' }
    }
  } catch (err) {
    console.error('Failed to cancel multipart upload', err)
    return {
      code: 500,
      msg: req.t('errors.fileUploadError'),
      status: 500
    }
  }
}

export async function handleMultipartChunk(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const { uploadId, chunkIndex } = req.params || {}
    const partNumber = parseInt(chunkIndex) + 1

    if (!uploadId || !partNumber || partNumber < 1) {
      return {
        code: 400,
        msg: req.t('errors.invalidRequest'),
        status: 400
      }
    }

    const encodedFileKey = req.getHeader('X-File-Key')
    if (!encodedFileKey) {
      return {
        code: 400,
        msg: req.t('errors.fileDataError'),
        status: 400
      }
    }
    const fileKey = decodeURIComponent(encodedFileKey)

    const chunkData = await req.request.arrayBuffer()
    if (!chunkData || chunkData.byteLength === 0) {
      return {
        code: 400,
        msg: req.t('errors.fileDataError'),
        status: 400
      }
    }

    const result = await ctx.storage.uploadPart({
      uploadId,
      key: fileKey,
      partNumber,
      data: chunkData
    })

    return {
      code: 0,
      data: {
        partNumber: result.partNumber,
        etag: result.etag,
        size: chunkData.byteLength
      }
    }
  } catch (err) {
    console.error('Chunk upload failed', err)
    return {
      code: 500,
      msg: req.t('errors.fileUploadError'),
      status: 500
    }
  }
}

export async function handleMultipartComplete(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const { uploadId } = req.params || {}
    const { fileKey, parts } = await req.json()

    if (!uploadId || !fileKey || !parts || !Array.isArray(parts)) {
      return {
        code: 400,
        msg: req.t('errors.invalidRequest'),
        status: 400
      }
    }

    const sortedParts = parts
      .map((part) => ({
        partNumber: part.partNumber,
        etag: part.etag
      }))
      .sort((a, b) => a.partNumber - b.partNumber)

    for (let i = 0; i < sortedParts.length; i++) {
      if (sortedParts[i].partNumber !== i + 1) {
        return {
          code: 400,
          msg: req.t('errors.fileUploadError'),
          status: 400
        }
      }
    }

    const result = await ctx.storage.completeMultipartUpload({
      uploadId,
      key: fileKey,
      parts
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
        message: 'File upload completed'
      }
    }
  } catch (err) {
    console.error('Failed to complete multipart upload', err)
    return {
      code: 500,
      msg: req.t('errors.fileUploadError'),
      status: 500
    }
  }
}
