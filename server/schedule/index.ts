/**
 * Cloudflare Workers 定时任务处理器
 * 自动清理过期的剪贴板数据和文件
 * @module scheduled
 */

import { D1 } from '../bindings/d1'
import { R2 } from '../bindings/r2'
import { Utils } from '../utils'

export default async (controller: ScheduledController, env: Env, _ctx: ExecutionContext) => {
    const startTime = Date.now()
    const context: IContext = {
      id: Utils.generateId('uuid'),
      word: '',
      startTime,
    }
    console.log(`🕒 Scheduled task started at ${new Date().toISOString()}`)

    try {
      // 执行清理任务
      await cleanupExpiredData(env, context)
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
async function cleanupExpiredData(
  env: Env,
  context: IContext
): Promise<{
  deletedRecords: number
  deletedFiles: number
  totalExecutionTime: number
}> {
  const cleanupStartTime = Date.now()
  const currentTimestamp = Date.now()

  console.log(`🔍 Starting cleanup process, current timestamp: ${currentTimestamp}`)

  // 1. 查询所有过期的记录
  const expiredRecords = await D1.page<KeywordDB>(
    env,
    'keyword',
    [{ key: 'expire_time', value: currentTimestamp, operator: '<' }],
    -1, // 不限制页面大小，获取所有过期记录
    -1
  )

  if (expiredRecords.length === 0) {
    console.log('✨ No expired records found, cleanup completed')
    return {
      deletedRecords: 0,
      deletedFiles: 0,
      totalExecutionTime: Date.now() - cleanupStartTime,
    }
  }

  console.log(`📋 Found ${expiredRecords.length} expired records to clean up`)

  let totalDeletedFiles = 0
  const deletedWords: string[] = []

  // 2. 删除每个过期记录对应的R2文件和文件夹
  for (const record of expiredRecords) {
    try {
      context.word = record.word
      console.log(`🗑️  Cleaning up word: ${record.word}, expired at: ${new Date(record.expire_time).toISOString()}`)

      // 删除该word下的所有文件（包括index.txt和files文件夹）
      const deletedFileCount = await R2.deleteFolder(env, context, { prefix: record.word })
      totalDeletedFiles += deletedFileCount

      deletedWords.push(record.word)

      console.log(`✅ Cleaned up ${deletedFileCount} files for word: ${record.word}`)
    } catch (error) {
      console.error(`❌ Failed to cleanup R2 files for word: ${record.word}`, error)
      // 继续处理其他记录，不因为单个记录失败而停止整个清理过程
    } finally {
      context.word = ''
    }
  }

  // 3. 批量删除数据库记录
  let deletedRecords = 0
  try {
    // 构建删除条件：word IN (word1, word2, ...)
    if (deletedWords.length > 0) {
      deletedRecords = await D1.delete(env, context, 'keyword', [
        { key: 'word', value: deletedWords, operator: 'IN' },
      ])
      console.log(`🗃️  Deleted ${deletedRecords} database records`)
    }
  } catch (error) {
    console.error('❌ Failed to delete database records', error)
    // 即使数据库删除失败，R2文件已经删除，也算是部分成功
  }

  const totalExecutionTime = Date.now() - cleanupStartTime

  const result = {
    deletedRecords,
    deletedFiles: totalDeletedFiles,
    totalExecutionTime,
  }

  console.log(`🎉 Cleanup completed`, result)

  return result
}
