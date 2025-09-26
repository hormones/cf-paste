import { IRequest, IContext, ApiResponse } from '../../types'
import { AdminOverviewRequest, AdminOverviewResponse } from '../../../shared/types/admin'

/**
 * Handle admin overview statistics
 * GET /api/admin/overview
 */
export async function handleOverview(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    // Parse query parameters
    const start = req.params?.start ? parseInt(req.params.start) : undefined
    const end = req.params?.end ? parseInt(req.params.end) : undefined

    // Validate timestamp parameters
    if ((start && isNaN(start)) || (end && isNaN(end))) {
      return {
        code: 400,
        msg: 'Invalid timestamp parameters',
        status: 400
      }
    }

    // Check if database adapter supports statistics
    if (!ctx.db.getOverviewStats) {
      return {
        code: 501,
        msg: 'Overview statistics not supported by current database adapter',
        status: 501
      }
    }

    // Build time range for adapter (using timestamps)
    const timeRange: { start?: number; end?: number } = {}
    if (start) {
      timeRange.start = start
    }
    if (end) {
      timeRange.end = end
    }

    // Get statistics from platform-specific adapter
    const response = await ctx.db.getOverviewStats(timeRange)

    console.log('Overview statistics generated:', response)

    return {
      code: 0,
      data: response
    }
  } catch (error) {
    console.error('Failed to get overview statistics:', error)
    return {
      code: 500,
      msg: 'Failed to get overview statistics',
      status: 500
    }
  }
}