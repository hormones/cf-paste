import { DatabaseAdapter, WhereCondition, DatabaseOperation } from '../../types'
import { AdminOverviewResponse, AdminActivityRequest, AdminActivityResponse, AdminActivityDataPoint, AdminRankingRequest, AdminRankingResponse, RankingItem, AdminLogsRequest, AdminLogsResponse, AdminLogItem, Action } from '../../../shared/types/admin'
import {
  buildInsertSql,
  buildUpdateSql,
  buildDeleteSql,
  buildSelectSql,
} from '../../common/sql-builder'

export function createD1Adapter(d1: D1Database): DatabaseAdapter {
  return {
    async query<T = any>(table: string, where: WhereCondition[]): Promise<T[]> {
      const { sql, values } = buildSelectSql(table, where)
      const stmt = d1.prepare(sql)
      const result = values.length > 0 ? stmt.bind(...values) : stmt
      return result.all().then((res) => res.results as T[])
    },

    async first<T = any>(table: string, where: WhereCondition[]): Promise<T | null> {
      const { sql, values } = buildSelectSql(table, where)
      const stmt = d1.prepare(sql)
      const result = values.length > 0 ? stmt.bind(...values) : stmt
      const res = await result.first()
      return (res as T) || null
    },

    async insert(table: string, data: Record<string, any>): Promise<any> {
      const { sql, values } = buildInsertSql(table, data)
      const stmt = d1.prepare(sql)
      const result = stmt.bind(...values)
      const runResult = await result.run()
      return runResult.meta?.last_row_id || runResult.success
    },

    async update(table: string, data: Record<string, any>, where: WhereCondition[]): Promise<any> {
      const { sql, values } = buildUpdateSql(table, data, where)
      const stmt = d1.prepare(sql)
      const result = stmt.bind(...values)
      const runResult = await result.run()
      return runResult.meta?.changes || 0
    },

    async delete(table: string, where: WhereCondition[]): Promise<any> {
      const { sql, values } = buildDeleteSql(table, where)
      const stmt = d1.prepare(sql)
      const result = stmt.bind(...values)
      const runResult = await result.run()
      return runResult.meta?.changes || 0
    },

    async batch(operations: DatabaseOperation[]): Promise<any[]> {
      const stmts = operations.map((op) => {
        switch (op.type) {
          case 'query':
            return d1.prepare(op.sql).bind(...(op.params || []))
          case 'insert':
            const { sql, values } = buildInsertSql(op.table, op.data)
            return d1.prepare(sql).bind(...values)
          case 'update':
            const updateSql = buildUpdateSql(op.table, op.data, op.where)
            return d1.prepare(updateSql.sql).bind(...updateSql.values)
          case 'delete':
            const deleteSql = buildDeleteSql(op.table, op.where)
            return d1.prepare(deleteSql.sql).bind(...deleteSql.values)
          default:
            throw new Error(`Unsupported operation type: ${(op as any).type}`)
        }
      })

      return d1.batch(stmts)
    },

    async transaction<T>(callback: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
      // D1 doesn't support transactions in the same way, so we'll just execute the callback
      // In a real implementation, you might want to handle this differently
      return callback(this)
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

      const stmt = d1.prepare(sql)
      const result = queryParams.length > 0 ? stmt.bind(...queryParams) : stmt
      const statsResult = await result.first()

      return {
        totalViews: Number(statsResult?.total_views) || 0,
        totalCreates: Number(statsResult?.total_creates) || 0,
        activeIPs: Number(statsResult?.active_ips) || 0,
        todayCreates: Number(statsResult?.today_new_count) || 0
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

      const stmt = d1.prepare(sql)
      const result = queryParams.length > 0 ? stmt.bind(...queryParams) : stmt
      const activityResults = await result.all()

      const data: AdminActivityDataPoint[] = (activityResults.results || []).map((row: any) => ({
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
      const topIpsStmt = d1.prepare(topIpsSql)
      const topCountriesStmt = d1.prepare(topCountriesSql)
      const topRegionsStmt = d1.prepare(topRegionsSql)

      const topIpsResult = params.length > 0 ? topIpsStmt.bind(...params) : topIpsStmt
      const topCountriesResult = params.length > 0 ? topCountriesStmt.bind(...params) : topCountriesStmt
      const topRegionsResult = params.length > 0 ? topRegionsStmt.bind(...params) : topRegionsStmt

      const [topIpsData, topCountriesData, topRegionsData] = await Promise.all([
        topIpsResult.all(),
        topCountriesResult.all(),
        topRegionsResult.all()
      ])

      const topIps: RankingItem[] = (topIpsData.results || []).map((row: any) => ({
        name: row.name || 'other',
        count: row.count || 0
      }))

      const topCountries: RankingItem[] = (topCountriesData.results || []).map((row: any) => ({
        name: row.name || 'other',
        count: row.count || 0
      }))

      const topRegions: RankingItem[] = (topRegionsData.results || []).map((row: any) => ({
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

      const countStmt = d1.prepare(countSql)
      const countResult = params.length > 0 ? countStmt.bind(...params) : countStmt
      const countData = await countResult.first()
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

      const logsStmt = d1.prepare(logsSql)
      const logsParams = [...params, pageSize, offset]
      const logsResult = logsStmt.bind(...logsParams)
      const logsData = await logsResult.all()

      // Transform results and add action labels
      const items: AdminLogItem[] = (logsData.results || []).map((row: any) => ({
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
    },
  }
}
