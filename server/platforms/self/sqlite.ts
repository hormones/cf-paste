import Database from 'better-sqlite3'
import { DatabaseAdapter, WhereCondition, DatabaseOperation } from '../../types'
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
      return { lastInsertRowid: result.lastInsertRowid, changes: result.changes }
    },

    async update(table: string, data: Record<string, any>, where: WhereCondition[]): Promise<any> {
      const { sql, values } = buildUpdateSql(table, data, where)
      const stmt = db.prepare(sql)
      const result = stmt.run(values)
      return { changes: result.changes }
    },

    async delete(table: string, where: WhereCondition[]): Promise<any> {
      const { sql, values } = buildDeleteSql(table, where)
      const stmt = db.prepare(sql)
      const result = stmt.run(values)
      return { changes: result.changes }
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
    }
  }
}
