import { DatabaseAdapter, WhereCondition, DatabaseOperation } from '../../types'
import './worker-configuration.d.ts'

const buildInsertSql = (table: string, data: Record<string, any>) => {
  const keys = Object.keys(data)
  const placeholders = keys.map(() => '?').join(', ')
  return {
    sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    values: Object.values(data),
  }
}

const buildUpdateSql = (table: string, data: Record<string, any>, where: WhereCondition[]) => {
  const setClause = Object.keys(data)
    .map((key) => `${key} = ?`)
    .join(', ')
  const whereClause = where
    .map((condition) => {
      const operator = condition.operator || '='
      return `${condition.key} ${operator} ?`
    })
    .join(' AND ')
  return {
    sql: `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`,
    values: [...Object.values(data), ...where.map((w) => w.value)],
  }
}

const buildDeleteSql = (table: string, where: WhereCondition[]) => {
  const whereClause = where
    .map((condition) => {
      const operator = condition.operator || '='
      return `${condition.key} ${operator} ?`
    })
    .join(' AND ')
  return {
    sql: `DELETE FROM ${table} WHERE ${whereClause}`,
    values: where.map((w) => w.value),
  }
}

export function createD1Adapter(d1: D1Database): DatabaseAdapter {
  return {
    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
      const stmt = d1.prepare(sql)
      const result = params ? stmt.bind(...params) : stmt
      return result.all().then((res) => res.results as T[])
    },

    async first<T = any>(sql: string, params?: any[]): Promise<T | null> {
      const stmt = d1.prepare(sql)
      const result = params ? stmt.bind(...params) : stmt
      const res = await result.first()
      return (res as T) || null
    },

    async insert(table: string, data: Record<string, any>): Promise<any> {
      const { sql, values } = buildInsertSql(table, data)
      const stmt = d1.prepare(sql)
      const result = stmt.bind(...values)
      return result.run()
    },

    async update(table: string, data: Record<string, any>, where: WhereCondition[]): Promise<any> {
      const { sql, values } = buildUpdateSql(table, data, where)
      const stmt = d1.prepare(sql)
      const result = stmt.bind(...values)
      return result.run()
    },

    async delete(table: string, where: WhereCondition[]): Promise<any> {
      const { sql, values } = buildDeleteSql(table, where)
      const stmt = d1.prepare(sql)
      const result = stmt.bind(...values)
      return result.run()
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
  }
}
