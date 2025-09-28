import { IRequest, IContext, ApiResponse } from '../../types'
import { AdminRankingRequest, AdminRankingResponse } from '../../../shared/types/admin'

/**
 * Handle admin ranking statistics
 * GET /api/admin/ranking
 */
export async function handleRanking(req: IRequest, ctx: IContext): Promise<ApiResponse> {
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

    // Check if database adapter supports ranking statistics
    if (!ctx.db.getRankingStats) {
      return {
        code: 501,
        msg: 'Ranking statistics not supported by current database adapter',
        status: 501
      }
    }

    // Build request object
    const rankingRequest: AdminRankingRequest = {
      start,
      end
    }

    // Get ranking statistics from platform-specific adapter
    const response = await ctx.db.getRankingStats(rankingRequest)

    console.log('Ranking statistics generated:', {
      topIpsCount: response.topIps.length,
      topCountriesCount: response.topCountries.length,
      topRegionsCount: response.topRegions.length
    })

    return {
      code: 0,
      data: response
    }
  } catch (error) {
    console.error('Failed to get ranking statistics:', error)
    return {
      code: 500,
      msg: 'Failed to get ranking statistics',
      status: 500
    }
  }
}
