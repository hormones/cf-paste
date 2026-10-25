import { WhereCondition } from '../types'

export interface SqlQuery {
  sql: string
  values: any[]
}

export const buildInsertSql = (table: string, data: Record<string, any>): SqlQuery => {
  const keys = Object.keys(data)
  const placeholders = keys.map(() => '?').join(', ')
  return {
    sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    values: Object.values(data),
  }
}

export const buildUpdateSql = (table: string, data: Record<string, any>, where: WhereCondition[]): SqlQuery => {
  const setClause = Object.keys(data)
    .map((key) => `${key} = ?`)
    .join(', ')
  const whereClause = buildWhereClause(where)
  return {
    sql: `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`,
    values: [...Object.values(data), ...where.map((w) => w.value)],
  }
}

export const buildDeleteSql = (table: string, where: WhereCondition[]): SqlQuery => {
  const whereClause = buildWhereClause(where)
  return {
    sql: `DELETE FROM ${table} WHERE ${whereClause}`,
    values: where.map((w) => w.value),
  }
}

export const buildSelectSql = (table: string, where: WhereCondition[], columns = '*'): SqlQuery => {
  const whereClause = buildWhereClause(where)
  return {
    sql: `SELECT ${columns} FROM ${table} WHERE ${whereClause}`,
    values: where.map((w) => w.value),
  }
}

const buildWhereClause = (where: WhereCondition[]): string => {
  return where
    .map((condition) => {
      const operator = condition.operator || '='
      return `${condition.key} ${operator} ?`
    })
    .join(' AND ')
}
