import { ApiResponse, IContext, IRequest, Middleware } from '../types'
import { Action } from '../../shared/types/admin'
import { createActivityLogger, extractLogContext } from '../common/activityLogger'

/**
 * Creates a middleware factory that can be configured with specific action mapping
 * This allows for more specific logging behavior for different routes
 */
export function activityLogMiddleware(action?: Action): Middleware {
  return async (req: IRequest, ctx: IContext, next) => {
    const response = await next()

    // Only log successful operations
    if (response.status && (response.status < 200 || response.status >= 300)) {
      return response
    }

    if (!action) {
      return response
    }

    if (action == Action.VIEW && !req.id) {
      return response
    }

    const logContext = extractLogContext(req)
    const activityLogger = createActivityLogger(ctx)

    try {
      const desc = extractDescription(req, response)

      await activityLogger.record({
        action,
        word: req.word,
        wordId: req.id,
        desc,
        context: logContext
      })

    } catch (error) {
      console.error('ActivityLogMiddleware: Failed to record activity', error)
    }

    return response
  }
}

/**
 * Extracts description information for operations that need it
 * Mainly for file operations to record filename
 */
function extractDescription(req: IRequest, response: ApiResponse): string | undefined {
  // For file operations, try to extract filename from request or response
  if (req.path.includes('/file')) {
    // Check if there's filename in query parameters
    if (req.params?.filename) {
      return req.params.filename
    }

    // Check if there's filename in response data
    if (response.data && typeof response.data === 'object') {
      if (response.data.filename) {
        return response.data.filename
      }
      if (response.data.name) {
        return response.data.name
      }
    }

    // For multipart operations, extract from path
    if (req.path.includes('/multipart/')) {
      const pathSegments = req.path.split('/')
      const uploadIdIndex = pathSegments.findIndex(segment => segment === 'multipart') + 1
      if (uploadIdIndex > 0 && pathSegments[uploadIdIndex + 1]) {
        return `multipart_${pathSegments[uploadIdIndex + 1]}`
      }
    }
  }

  return undefined
}

// Data operation middlewares
export const createLogMiddleware = activityLogMiddleware(Action.CREATE)
export const updateLogMiddleware = activityLogMiddleware(Action.UPDATE_CONTENT)
export const deleteLogMiddleware = activityLogMiddleware(Action.DELETE)

// File operation middlewares
export const uploadFileLogMiddleware = activityLogMiddleware(Action.UPLOAD_FILE)
export const downloadFileLogMiddleware = activityLogMiddleware(Action.DOWNLOAD_FILE)
export const deleteFileLogMiddleware = activityLogMiddleware(Action.DELETE_FILE)

// View operation middleware
export const viewLogMiddleware = activityLogMiddleware(Action.VIEW)
