import { D1 } from '../bindings/d1'
import { deleteKeyword } from '../api/data'

export default async (_controller: ScheduledController, env: Env, _ctx: ExecutionContext) => {
  const startTime = Date.now()
  console.log(`🕒 Scheduled task started at ${new Date().toISOString()}`)

  try {
    await cleanupExpiredData(env)
    console.log(`✅ Scheduled task completed successfully`)
  } catch (error) {
    console.error(`❌ Scheduled task failed`, error)
    throw error
  } finally {
    const executionTime = Date.now() - startTime
    console.log(`Scheduled task ended after ${executionTime}ms`)
  }
}

async function cleanupExpiredData(env: Env) {
  const currentTimestamp = Date.now()

  console.log(`🔍 Starting cleanup process, current timestamp: ${currentTimestamp}`)

  // Clean up expired keywords
  const expiredKeywords = await D1.page<KeywordDB>(
    env,
    'keyword',
    [{ key: 'expire_time', value: currentTimestamp, operator: '<' }],
    -1, // No page size limit, get all expired records
    -1
  )

  if (expiredKeywords.length === 0) {
    console.log('✨ No expired keywords found, cleanup completed')
  }

  console.log(`📋 Found ${expiredKeywords.length} expired keywords to clean up`)

  for (const keyword of expiredKeywords) {
    try {
      console.log(
        `🗑️  Cleaning up word: ${keyword.word}, expired at: ${new Date(
          keyword.expire_time
        ).toISOString()}`
      )

      await deleteKeyword(env, keyword.word)
    } catch (error) {
      console.error(`❌ Failed to cleanup word: ${keyword.word}`, error)
      // Continue processing other records, don't stop the entire cleanup process due to single record failure
    }
  }

  console.log(`🎉 Cleanup completed`)
}
