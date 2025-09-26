import { ApiResponse, IContext, IRequest } from '../../types'
import { AdminActivityRequest } from '../../../shared/types/admin'

/**
 * Handle admin activity statistics
 * GET /api/admin/activity
 */
export async function handleActivity(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    // Parse query parameters
    const start = req.params?.start ? parseInt(req.params.start) : undefined
    const end = req.params?.end ? parseInt(req.params.end) : undefined
    const metric = req.params?.metric as AdminActivityRequest['metric']
    const granularity = req.params?.granularity as AdminActivityRequest['granularity']

    // Validate timestamp parameters
    if ((start && isNaN(start)) || (end && isNaN(end))) {
      return {
        code: 400,
        msg: 'Invalid timestamp parameters',
        status: 400
      }
    }

    // Validate metric parameter
    if (metric && !['create', 'update', 'delete', 'view', 'all'].includes(metric)) {
      return {
        code: 400,
        msg: 'Invalid metric parameter. Must be one of: create, update, delete, view, all',
        status: 400
      }
    }

    // Validate granularity parameter
    if (granularity && !['day', 'month', 'year', 'all'].includes(granularity)) {
      return {
        code: 400,
        msg: 'Invalid granularity parameter. Must be one of: day, month, year, all',
        status: 400
      }
    }

    // Check if database adapter supports activity statistics
    if (!ctx.db.getActivityStats) {
      return {
        code: 501,
        msg: 'Activity statistics not supported by current database adapter',
        status: 501
      }
    }

    // Build request object
    const activityRequest: AdminActivityRequest = {
      start,
      end,
      metric: metric || 'all',
      granularity: granularity || 'day'
    }

    // Get activity statistics from platform-specific adapter
    const response = await ctx.db.getActivityStats(activityRequest)

    console.log('Activity statistics generated:', {
      dataPoints: response.data.length,
      metrics: [...new Set(response.data.map(d => d.metric))],
      buckets: [...new Set(response.data.map(d => d.bucket))]
    })

    return {
      code: 0,
      data: response
    }
  } catch (error) {
    console.error('Failed to get activity statistics:', error)
    return {
      code: 500,
      msg: 'Failed to get activity statistics',
      status: 500
    }
  }
}
