import Database from 'better-sqlite3'
import { DatabaseAdapter, WhereCondition, DatabaseOperation } from '../../types'
import { AdminOverviewResponse, AdminActivityRequest, AdminActivityResponse, AdminActivityDataPoint, AdminRankingRequest, AdminRankingResponse, RankingItem, AdminLogsRequest, AdminLogsResponse, AdminLogItem, Action } from '../../../shared/types/admin'
import { buildInsertSql, buildUpdateSql, buildDeleteSql, buildSelectSql } from '../../common/sql-builder'

export function createSqliteAdapter(dbPath: string): DatabaseAdapter {
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return {
    async query<T = any>(table: string, where: WhereCondition[]): Promise<T[]> {
      const { sql, values } = buildSelectSql(table, where)
      const stmt = db.prepare(sql)
      return stmt.all(values) as T[]
    },

    async first<T = any>(table: string, where: WhereCondition[]): Promise<T | null> {
      const { sql, values } = buildSelectSql(table, where)
      const stmt = db.prepare(sql)
      const result = stmt.get(values) as T
      return result || null
    },

    async insert(table: string, data: Record<string, any>): Promise<any> {
      const { sql, values } = buildInsertSql(table, data)
      const stmt = db.prepare(sql)
      const result = stmt.run(values)
      return result.lastInsertRowid
    },

    async update(table: string, data: Record<string, any>, where: WhereCondition[]): Promise<any> {
      const { sql, values } = buildUpdateSql(table, data, where)
      const stmt = db.prepare(sql)
      const result = stmt.run(values)
      return result.changes
    },

    async delete(table: string, where: WhereCondition[]): Promise<any> {
      const { sql, values } = buildDeleteSql(table, where)
      const stmt = db.prepare(sql)
      const result = stmt.run(values)
      return result.changes
    },

    async batch(operations: DatabaseOperation[]): Promise<any[]> {
      const results: any[] = []

      const transaction = db.transaction(() => {
        for (const op of operations) {
          switch (op.type) {
            case 'query':
              const queryStmt = db.prepare(op.sql)
              results.push(queryStmt.all(op.params || []))
              break
            case 'insert':
              const { sql: insertSql, values: insertValues } = buildInsertSql(op.table, op.data)
              const insertStmt = db.prepare(insertSql)
              results.push(insertStmt.run(insertValues))
              break
            case 'update':
              const updateSql = buildUpdateSql(op.table, op.data, op.where)
              const updateStmt = db.prepare(updateSql.sql)
              results.push(updateStmt.run(updateSql.values))
              break
            case 'delete':
              const deleteSql = buildDeleteSql(op.table, op.where)
              const deleteStmt = db.prepare(deleteSql.sql)
              results.push(deleteStmt.run(deleteSql.values))
              break
            default:
              throw new Error(`Unsupported operation type: ${(op as any).type}`)
          }
        }
      })

      transaction()
      return results
    },

    async transaction<T>(callback: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(() => {
          try {
            const result = callback(this)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        })

        try {
          transaction()
        } catch (error) {
          reject(error)
        }
      })
    },

    async getOverviewStats(timeRange?: { start?: number; end?: number }): Promise<AdminOverviewResponse> {
      // Build time range WHERE clause
      let timeWhereClause = ''
      const params: any[] = []

      if (timeRange?.start || timeRange?.end) {
        const conditions = []
        if (timeRange.start) {
          conditions.push('action_time >= ?')
          params.push(new Date(timeRange.start).toISOString())
        }
        if (timeRange.end) {
          conditions.push('action_time <= ?')
          params.push(new Date(timeRange.end).toISOString())
        }
        timeWhereClause = ' AND ' + conditions.join(' AND ')
      }

      // Get today's date range for today's new count
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      // Use CTE for optimized aggregation query
      const sql = `
        WITH stats AS (
          SELECT
            SUM(CASE WHEN action = 6 THEN 1 ELSE 0 END) as total_views,
            SUM(CASE WHEN action = 1 THEN 1 ELSE 0 END) as total_creates,
            COUNT(DISTINCT ip) as active_ips,
            SUM(CASE
              WHEN action = 1 AND action_time >= ? AND action_time <= ?
              THEN 1 ELSE 0
            END) as today_new_count
          FROM activity_log
          WHERE 1=1${timeWhereClause}
        )
        SELECT
          total_views,
          total_creates,
          active_ips,
          today_new_count
        FROM stats
      `

      const queryParams = [
        todayStart.toISOString(),  // today start
        todayEnd.toISOString(),    // today end
        ...params                  // time range parameters
      ]

      const stmt = db.prepare(sql)
      const statsResult = stmt.get(queryParams) as any

      return {
        totalViews: statsResult?.total_views || 0,
        totalCreates: statsResult?.total_creates || 0,
        activeIPs: statsResult?.active_ips || 0,
        todayCreates: statsResult?.today_new_count || 0
      }
    },

    async getActivityStats(request: AdminActivityRequest): Promise<AdminActivityResponse> {
      // Build time range WHERE clause
      let timeWhereClause = ''
      const params: any[] = []

      if (request.start || request.end) {
        const conditions = []
        if (request.start) {
          conditions.push('action_time >= ?')
          params.push(new Date(request.start).toISOString())
        }
        if (request.end) {
          conditions.push('action_time <= ?')
          params.push(new Date(request.end).toISOString())
        }
        timeWhereClause = ' AND ' + conditions.join(' AND ')
      }

      // Build metric filter
      let metricWhereClause = ''
      if (request.metric && request.metric !== 'all') {
        const actionMap = {
          'create': Action.CREATE,
          'update': Action.UPDATE_CONTENT,
          'delete': Action.DELETE,
          'view': Action.VIEW
        }
        metricWhereClause = ` AND action = ${actionMap[request.metric]}`
      }

      // Determine time format based on granularity
      let timeFormat = ''
      switch (request.granularity) {
        case 'day':
          timeFormat = '%Y-%m-%d'
          break
        case 'month':
          timeFormat = '%Y-%m'
          break
        case 'year':
          timeFormat = '%Y'
          break
        case 'all':
        default:
          timeFormat = 'all'
          break
      }

      let sql: string
      let queryParams: any[] = [...params]

      if (timeFormat === 'all') {
        // Aggregate all data without time grouping
        sql = `
          SELECT
            'all' as bucket,
            CASE action
              WHEN 1 THEN 'create'
              WHEN 2 THEN 'update'
              WHEN 7 THEN 'delete'
              WHEN 6 THEN 'view'
              ELSE 'other'
            END as metric,
            COUNT(*) as count,
            COUNT(DISTINCT word) as uniqueKeywords
          FROM activity_log
          WHERE 1=1${timeWhereClause}${metricWhereClause}
          GROUP BY action
          ORDER BY action
        `
      } else {
        // Group by time format
        sql = `
          SELECT
            strftime('${timeFormat}', action_time) as bucket,
            CASE action
              WHEN 1 THEN 'create'
              WHEN 2 THEN 'update'
              WHEN 7 THEN 'delete'
              WHEN 6 THEN 'view'
              ELSE 'other'
            END as metric,
            COUNT(*) as count,
            COUNT(DISTINCT word) as uniqueKeywords
          FROM activity_log
          WHERE 1=1${timeWhereClause}${metricWhereClause}
          GROUP BY strftime('${timeFormat}', action_time), action
          ORDER BY bucket, action
        `
      }

      const stmt = db.prepare(sql)
      const activityResults = stmt.all(queryParams)

      const data: AdminActivityDataPoint[] = (activityResults || []).map((row: any) => ({
        bucket: row.bucket || 'other',
        metric: row.metric || 'other',
        count: row.count || 0,
        uniqueKeywords: row.uniqueKeywords || 0
      }))

      return { data }
    },

    async getRankingStats(request: AdminRankingRequest): Promise<AdminRankingResponse> {
      // Build time range WHERE clause
      let timeWhereClause = ''
      const params: any[] = []

      if (request.start || request.end) {
        const conditions = []
        if (request.start) {
          conditions.push('action_time >= ?')
          params.push(new Date(request.start).toISOString())
        }
        if (request.end) {
          conditions.push('action_time <= ?')
          params.push(new Date(request.end).toISOString())
        }
        timeWhereClause = ' AND ' + conditions.join(' AND ')
      }

      // Query TOP5 IPs
      const topIpsSql = `
        SELECT ip as name, COUNT(*) as count
        FROM activity_log
        WHERE 1=1${timeWhereClause}
        GROUP BY ip
        ORDER BY count DESC
        LIMIT 5
      `

      // Query TOP5 Countries
      const topCountriesSql = `
        SELECT country as name, COUNT(*) as count
        FROM activity_log
        WHERE country IS NOT NULL AND country != '' AND country != '-'${timeWhereClause}
        GROUP BY country
        ORDER BY count DESC
        LIMIT 5
      `

      // Query TOP5 Regions
      const topRegionsSql = `
        SELECT region as name, COUNT(*) as count
        FROM activity_log
        WHERE region IS NOT NULL AND region != '' AND region != '-'${timeWhereClause}
        GROUP BY region
        ORDER BY count DESC
        LIMIT 5
      `

      // Execute all queries
      const topIpsStmt = db.prepare(topIpsSql)
      const topCountriesStmt = db.prepare(topCountriesSql)
      const topRegionsStmt = db.prepare(topRegionsSql)

      const topIpsData = topIpsStmt.all(params)
      const topCountriesData = topCountriesStmt.all(params)
      const topRegionsData = topRegionsStmt.all(params)

      const topIps: RankingItem[] = (topIpsData || []).map((row: any) => ({
        name: row.name || 'other',
        count: row.count || 0
      }))

      const topCountries: RankingItem[] = (topCountriesData || []).map((row: any) => ({
        name: row.name || 'other',
        count: row.count || 0
      }))

      const topRegions: RankingItem[] = (topRegionsData || []).map((row: any) => ({
        name: row.name || 'other',
        count: row.count || 0
      }))

      return {
        topIps,
        topCountries,
        topRegions
      }
    },

    async getActivityLogs(request: AdminLogsRequest): Promise<AdminLogsResponse> {
      // Build WHERE clause conditions
      const whereConditions: string[] = []
      const params: any[] = []

      // Word filter (fuzzy match)
      if (request.word) {
        whereConditions.push('word LIKE ?')
        params.push(`%${request.word}%`)
      }

      // IP filter (exact match)
      if (request.ip) {
        whereConditions.push('ip = ?')
        params.push(request.ip)
      }

      // Action filter
      if (request.action) {
        whereConditions.push('action = ?')
        params.push(request.action)
      }

      // Country filter (exact match)
      if (request.country) {
        whereConditions.push('country = ?')
        params.push(request.country)
      }

      // Region filter (exact match)
      if (request.region) {
        whereConditions.push('region = ?')
        params.push(request.region)
      }

      // Time range filter
      if (request.start) {
        whereConditions.push('action_time >= ?')
        params.push(new Date(request.start).toISOString())
      }
      if (request.end) {
        whereConditions.push('action_time <= ?')
        params.push(new Date(request.end).toISOString())
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : ''

      // Count total records for pagination
      const countSql = `
        SELECT COUNT(*) as total
        FROM activity_log
        ${whereClause}
      `

      const countStmt = db.prepare(countSql)
      const countData = countStmt.get(params) as any
      const total = Number(countData?.total) || 0

      // Calculate pagination
      const page = request.page || 1
      const pageSize = Math.min(request.pageSize || 50, 200)
      const offset = (page - 1) * pageSize
      const totalPages = Math.ceil(total / pageSize)

      // Query logs with pagination and ordering
      const logsSql = `
        SELECT id, word, word_id, ip, country, region, action, desc, action_time
        FROM activity_log
        ${whereClause}
        ORDER BY action_time DESC, id DESC
        LIMIT ? OFFSET ?
      `

      const logsStmt = db.prepare(logsSql)
      const logsParams = [...params, pageSize, offset]
      const logsData = logsStmt.all(logsParams) as any[]

      // Transform results and add action labels
      const items: AdminLogItem[] = (logsData || []).map((row: any) => ({
        id: row.id,
        word: row.word || '',
        word_id: row.word_id || null,
        ip: row.ip || '',
        country: row.country || '',
        region: row.region || '',
        action: row.action || Action.VIEW,
        desc: row.desc || undefined,
        actionTime: row.action_time ? new Date(row.action_time).getTime() : Date.now()
      }))

      return {
        items,
        pagination: {
          page,
          pageSize,
          total
        }
      }
    }
  }
}
