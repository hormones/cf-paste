import Database from 'better-sqlite3'
import { DatabaseAdapter, WhereCondition, DatabaseOperation } from '../../types'

const buildInsertSql = (table: string, data: Record<string, any>) => {
  const keys = Object.keys(data)
  const placeholders = keys.map(() => '?').join(', ')
  return {
    sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    values: Object.values(data)
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
    values: [...Object.values(data), ...where.map((w) => w.value)]
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
    values: where.map((w) => w.value)
  }
}

export function createSqliteAdapter(dbPath: string): DatabaseAdapter {
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return {
    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
      const stmt = db.prepare(sql)
      return stmt.all(params || []) as T[]
    },

    async first<T = any>(table: string, where: WhereCondition[]): Promise<T | null> {
      const whereClause = where
        .map((condition) => {
          const operator = condition.operator || '='
          return `${condition.key} ${operator} ?`
        })
        .join(' AND ')
      const stmt = db.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`)
      const result = stmt.get(where.map((w) => w.value)) as T
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
