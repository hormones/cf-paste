import { Env } from '../types/worker-configuration'

type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN'

type WhereCondition = {
  key: string
  value: string | number | Array<string | number>
  operator?: Operator
}

// 提取为独立函数
const processWhere = (where?: WhereCondition[]) => {
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
 * D1数据库绑定
 */
export const D1 = {
  /**
   * 查询单条数据
   */
  first: async <T>(env: Env, table: string, where?: WhereCondition[]): Promise<T | null> => {
    let sql = `SELECT * FROM ${table}`
    const { whereClause, values } = processWhere(where)
    sql += whereClause + ' LIMIT 1'
    return env.DB.prepare(sql)
      .bind(...values)
      .first<T>()
  },

  /**
   * 分页查询多条数据
   * @param page 页码，从1开始
   * @param size 每页大小，-1表示不限制
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
   * 插入数据，返回插入的id
   */
  insert: async (
    env: Env,
    table: string,
    data: Record<string, string | number>,
  ): Promise<number> => {
    const keys = Object.keys(data)
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
    const values = Object.values(data)

    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .then((result) => {
        if (result.meta?.last_row_id) {
          return result.meta.last_row_id
        }
        throw new Error('insert failed')
      })
  },

  /**
   * 更新数据
   */
  update: async (
    env: Env,
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

    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .then((result) => result.meta?.changes || 0)
  },

  /**
   * 删除数据
   */
  delete: async (env: Env, table: string, where?: WhereCondition[]): Promise<number> => {
    let sql = `DELETE FROM ${table}`
    const { whereClause, values } = processWhere(where)
    sql += whereClause

    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .then((result) => result.meta?.changes || 0)
  },
}
