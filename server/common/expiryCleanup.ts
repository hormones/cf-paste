import { IContext, KeywordDB } from '../types'
import { Action, ActivityLogContext } from '../../shared/types/admin'
import { ActivityLogger, createActivityLogger } from './activityLogger'

interface CleanupExpiredKeywordsOptions {
  logContext?: ActivityLogContext
  logger?: ActivityLogger
  now?: number
}

const DEFAULT_LOG_CONTEXT: ActivityLogContext = {
  ip: '-',
}

export async function cleanupExpiredKeywords(
  ctx: IContext,
  options: CleanupExpiredKeywordsOptions = {}
): Promise<number> {
  const now = options.now ?? Date.now()
  const expiredKeywords = await ctx.db.query<KeywordDB>('keyword', [
    { key: 'expire_time', operator: '<=', value: now },
    { key: 'expire_time', operator: '>', value: 0 },
  ])

  if (expiredKeywords.length === 0) {
    return 0
  }

  const activityLogger = options.logger ?? createActivityLogger(ctx)
  const logContext = options.logContext ?? { ...DEFAULT_LOG_CONTEXT }

  let removedCount = 0

  for (const keyword of expiredKeywords) {
    try {
      await ctx.storage.delete({ prefix: keyword.word, name: 'index.txt' })
    } catch (error) {
      console.warn(`cleanupExpiredKeywords: failed to delete index for ${keyword.word}`, error)
    }

    try {
      await ctx.storage.deleteFolder({ prefix: `${keyword.word}/files` })
    } catch (error) {
      console.warn(`cleanupExpiredKeywords: failed to delete files folder for ${keyword.word}`, error)
    }

    await ctx.db.delete('keyword', [{ key: 'word', value: keyword.word }])
    removedCount += 1

    try {
      await activityLogger.record({
        action: Action.AUTO_EXPIRE,
        word: keyword.word,
        wordId: keyword.id ?? null,
        desc: 'Auto expired by scheduler',
        context: logContext,
      })
    } catch (error) {
      console.error('cleanupExpiredKeywords: failed to record activity', error)
    }
  }

  return removedCount
}
