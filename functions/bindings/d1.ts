/**
 * D1数据库操作封装
 * 提供基础的CRUD操作，支持灵活的查询条件
 * @module bindings/d1
 */

import { Env, WhereCondition } from '../types/worker-configuration'
import { Utils } from '../utils'

/**
 * 处理SQL查询条件
 * @param where 查询条件数组
 * @returns 处理后的SQL条件子句和参数值
 */
const processWhere = <K>(where?: WhereCondition<K>[]) => {
  if (!where || where.length === 0) {
    return { whereClause: '', values: [] }
  }

  const values: (string | number)[] = []
  const whereClause = where
    .map((w) => {
      const operator = w.operator || '='
      if (operator === 'IN' && Array.isArray(w.value)) {
        const placeholders = w.value.map(() => '?').join(', ')
        values.push(...w.value)
        return `${w.key} IN (${placeholders})`
      } else {
        values.push(w.value as string | number)
        return `${w.key} ${operator} ?`
      }
    })
    .join(' AND ')

  return { whereClause: ` WHERE ${whereClause}`, values }
}

/**
 * D1数据库操作封装
 */
export const D1 = {
  /**
   * 查询单条数据
   * @param env 环境变量
   * @param table 表名
   * @param where 查询条件
   * @returns 单条记录或null
   */
  first: async <K, T>(env: Env, table: string, where?: WhereCondition<K>[]): Promise<T | null> => {
    let sql = `SELECT * FROM ${table}`
    const { whereClause, values } = processWhere<K>(where)
    sql += whereClause + ' LIMIT 1'
    return env.DB.prepare(sql)
      .bind(...values)
      .first<T>()
  },

  /**
   * 分页查询数据
   * @param env 环境变量
   * @param table 表名
   * @param where 查询条件
   * @param page 页码，从1开始
   * @param size 每页大小，-1表示不限制
   * @returns 数据列表
   */
  page: async <K, T>(
    env: Env,
    table: string,
    where?: WhereCondition<K>[],
    page = 1,
    size = 10,
  ): Promise<T[]> => {
    let sql = `SELECT * FROM ${table}`
    const { whereClause, values } = processWhere<K>(where)
    sql += whereClause

    if (page !== -1 && size !== -1) {
      sql += ' LIMIT ? OFFSET ?'
      values.push(size, (page - 1) * size)
    }

    return env.DB.prepare(sql)
      .bind(...values)
      .all<T>()
      .then((result) => result.results)
  },

  /**
   * 插入数据
   * @param env 环境变量
   * @param table 表名
   * @param data 要插入的数据
   * @returns 插入记录的ID
   * @throws 插入失败时抛出错误
   */
  insert: async (env: Env, table: string, data: Record<string, unknown>): Promise<number> => {
    const keys = Object.keys(data)
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
    const values = Object.values(data)

    Utils.log(env, sql, values)
    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .then((result) => {
        if (result.meta?.last_row_id) {
          return result.meta.last_row_id
        }
        throw new Error(`insert failed, affected rows: ${result.meta?.changes}`)
      })
      .catch((error) => {
        Utils.error(env, 'insert failed', error, sql, values)
        throw new Error('insert failed')
      })
  },

  /**
   * 更新数据
   * @param env 环境变量
   * @param table 表名
   * @param data 要更新的数据
   * @param where 更新条件
   * @returns 更新的记录数
   */
  update: async <K>(
    env: Env,
    table: string,
    data: Record<string, string | number>,
    where?: WhereCondition<K>[],
  ): Promise<number> => {
    // 过滤掉id字段，不允许更新id
    const { _id, ...updateData } = data

    let sql = `UPDATE ${table} SET ${Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(', ')}`
    const values = Object.values(updateData)

    const { whereClause, values: whereValues } = processWhere<K>(where)
    sql += whereClause
    values.push(...whereValues)

    Utils.log(env, sql, values)
    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .then((result) => result.meta?.changes || 0)
  },

  /**
   * 删除数据
   * @param env 环境变量
   * @param table 表名
   * @param where 删除条件
   * @returns 删除的记录数
   */
  delete: async <K>(env: Env, table: string, where?: WhereCondition<K>[]): Promise<number> => {
    let sql = `DELETE FROM ${table}`
    const { whereClause, values } = processWhere<K>(where)
    sql += whereClause

    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .then((result) => result.meta?.changes || 0)
  },
}
