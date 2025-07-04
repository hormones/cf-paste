/**
 * Cloudflare Workers 定时任务处理器
 * 自动清理过期的剪贴板数据和文件
 * @module scheduled
 */

import { D1 } from '../bindings/d1'
import { deleteKeyword } from '../api/data'

export default async (_controller: ScheduledController, env: Env, _ctx: ExecutionContext) => {
  const startTime = Date.now()
  console.log(`🕒 Scheduled task started at ${new Date().toISOString()}`)

  try {
    // 执行清理任务
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

/**
 * 清理过期数据的核心函数
 * @param env 环境变量
 * @returns 清理结果统计
 */
async function cleanupExpiredData(env: Env) {
  const currentTimestamp = Date.now()

  console.log(`🔍 Starting cleanup process, current timestamp: ${currentTimestamp}`)

  // 清理过期的keywords
  const expiredKeywords = await D1.page<KeywordDB>(
    env,
    'keyword',
    [{ key: 'expire_time', value: currentTimestamp, operator: '<' }],
    -1, // 不限制页面大小，获取所有过期记录
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
      // 继续处理其他记录，不因为单个记录失败而停止整个清理过程
    }
  }

  console.log(`🎉 Cleanup completed`)
}
