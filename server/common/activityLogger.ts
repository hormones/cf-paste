import { IContext } from '../types'
import { ActivityLogContext, RecordActivityParams } from '../../shared/types/admin'

/**
 * Activity Logger - handles standardized activity log recording
 *
 * This module provides a unified interface for recording user activities
 * to the activity_log table, with automatic IP/geo extraction and
 * standardized data structure generation.
 */
export class ActivityLogger {
  private ctx: IContext

  constructor(ctx: IContext) {
    this.ctx = ctx
  }

  /**
   * Records an activity log entry
   *
   * @param params - Activity recording parameters
   * @returns Promise<void>
   */
  async record(params: RecordActivityParams): Promise<void> {
    const { action, word, wordId, desc, context } = params

    // Validate required parameters
    if (!word || !context.ip) {
      console.warn('ActivityLogger: Missing required parameters (word or IP)')
      return
    }

    // Build standardized log entry data
    const logData = {
      action,
      word_id: wordId,
      word,
      ip: context.ip,
      country: context.country || null,
      region: context.region || null,
      desc: desc || null,
    }

    try {
      // Insert into activity_log table
      // The upsert_activity_log trigger will handle deduplication for UPDATE_CONTENT(2) and VIEW(6) actions
      await this.ctx.db.insert('activity_log', logData)

      console.log(`ActivityLogger: Recorded action ${action} for word "${word}" from IP ${context.ip}`)
    } catch (error) {
      console.error('ActivityLogger: Failed to record activity', error)
      // Don't throw error to avoid breaking the main request flow
    }
  }

  /**
   * Creates an activity logger instance for a specific request context
   *
   * @param ctx - The application context
   * @returns ActivityLogger instance
   */
  static create(ctx: IContext): ActivityLogger {
    return new ActivityLogger(ctx)
  }
}

/**
 * Factory function to create an ActivityLogger instance
 *
 * @param ctx - The application context
 * @returns ActivityLogger instance
 */
export function createActivityLogger(ctx: IContext): ActivityLogger {
  return ActivityLogger.create(ctx)
}

/**
 * Helper function to extract activity log context from request
 * This function extracts IP, geolocation and other context info from the request
 *
 * @param req - Request object
 * @returns ActivityLogContext
 */
export function extractLogContext(req: { ip: string; location?: string; getHeader?: (name: string) => string | null }): ActivityLogContext {
  // Parse location string "country:region" or just use IP if location not available
  const location = req.location || ''
  const [country, region] = location.includes(':') ? location.split(':') : ['', '']

  return {
    ip: req.ip || 'unknown',
    country: country || undefined,
    region: region || undefined,
    userAgent: req.getHeader?.('User-Agent') || undefined,
    referer: req.getHeader?.('Referer') || undefined
  }
}
