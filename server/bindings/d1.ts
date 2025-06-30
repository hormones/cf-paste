/**
 * D1数据库操作封装
 * 提供基础的CRUD操作，支持灵活的查询条件
 * @module bindings/d1
 */

import { Constant } from '../constant'

/**
 * 处理SQL查询条件
 * @param where 查询条件数组
 * @returns 处理后的SQL条件子句和参数值
 */
const processWhere = (where?: WhereCondition[]) => {
  if (!where || where.length === 0) {
    return { whereClause: '', values: [] }
  }

  const values: (string | number)[] = []
  const whereClause = where
    .filter((w) => !(w.key === 'password' && w.value === Constant.PASSWORD_DISPLAY))
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
  first: async <T>(env: Env, context: IContext, table: string, where?: WhereCondition[]): Promise<T | null> => {
    let sql = `SELECT * FROM ${table}`
    const { whereClause, values } = processWhere(where)
    sql += whereClause + ' LIMIT 1'
    console.log('SQL:', sql, 'Values:', values)
    return env.DB.prepare(sql)
      .bind(...values)
      .first<T>()
      .catch((error) => {
        console.error('d1 first failed\n', sql, values, error)
        throw new Error('first failed')
      })
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
  page: async <T>(
    env: Env,
    table: string,
    where?: WhereCondition[],
    page = 1,
    size = 10,
  ): Promise<T[]> => {
    let sql = `SELECT * FROM ${table}`
    const { whereClause, values } = processWhere(where)
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
  insert: async (env: Env, context: IContext, table: string, data: Record<string, unknown>): Promise<number> => {
    const keys = Object.keys(data)
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
    const values = Object.values(data)

    console.log('SQL:', sql, 'Values:', values)
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
        console.error('insert failed', error, 'SQL:', sql, 'Values:', values)
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
  update: async (
    env: Env,
    context: IContext,
    table: string,
    data: Record<string, string | number>,
    where?: WhereCondition[],
  ): Promise<number> => {
    let sql = `UPDATE ${table} SET ${Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ')}`
    const values = Object.values(data)

    const { whereClause, values: whereValues } = processWhere(where)
    sql += whereClause
    values.push(...whereValues)

    console.log('SQL:', sql, 'Values:', values)
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
  delete: async (env: Env, context: IContext, table: string, where?: WhereCondition[]): Promise<number> => {
    let sql = `DELETE FROM ${table}`
    const { whereClause, values } = processWhere(where)
    sql += whereClause

    console.log('SQL:', sql, 'Values:', values)
    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .then((result) => result.meta?.changes || 0)
  },
}
