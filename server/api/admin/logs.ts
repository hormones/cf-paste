import { IRequest, IContext, ApiResponse } from '../../types'
import { AdminLogsRequest, AdminLogsResponse, Action, ActionLabels } from '../../../shared/types/admin'

/**
 * Handle admin logs query
 * GET /api/admin/logs
 */
export async function handleLogs(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    // Parse query parameters
    const page = req.params?.page ? parseInt(req.params.page) : 1
    const pageSize = req.params?.pageSize ? parseInt(req.params.pageSize) : 50
    const word = req.params?.word || undefined
    const ip = req.params?.ip || undefined
    const action = req.params?.action ? parseInt(req.params.action) : undefined
    const country = req.params?.country || undefined
    const region = req.params?.region || undefined
    const start = req.params?.start ? parseInt(req.params.start) : undefined
    const end = req.params?.end ? parseInt(req.params.end) : undefined

    // Validate parameters
    if (page < 1 || isNaN(page)) {
      return {
        code: 400,
        msg: 'Invalid page number',
        status: 400
      }
    }

    if (pageSize < 1 || pageSize > 200 || isNaN(pageSize)) {
      return {
        code: 400,
        msg: 'Invalid page size (1-200)',
        status: 400
      }
    }

    if ((start && isNaN(start)) || (end && isNaN(end))) {
      return {
        code: 400,
        msg: 'Invalid timestamp parameters',
        status: 400
      }
    }

    if (action && !Object.values(Action).includes(action)) {
      return {
        code: 400,
        msg: 'Invalid action parameter',
        status: 400
      }
    }

    // Check if database adapter supports log query
    if (!ctx.db.getActivityLogs) {
      return {
        code: 501,
        msg: 'Activity logs query not supported by current database adapter',
        status: 501
      }
    }

    // Build request object
    const logsRequest: AdminLogsRequest = {
      page,
      pageSize,
      word,
      ip,
      action,
      country,
      region,
      start,
      end
    }

    // Get logs from platform-specific adapter
    const response = await ctx.db.getActivityLogs(logsRequest)

    console.log(`Activity logs query completed: page=${page}, pageSize=${pageSize}, total=${response.pagination.total}`)

    return {
      code: 0,
      data: response
    }
  } catch (error) {
    console.error('Failed to get activity logs:', error)
    return {
      code: 500,
      msg: 'Failed to get activity logs',
      status: 500
    }
  }
}
