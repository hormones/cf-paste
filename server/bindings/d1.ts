import { Constant } from '../constant'

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

export const D1 = {
  /**
   * Query single record
   */
  first: async <T>(
    env: Env,
    table: string,
    where?: WhereCondition[]
  ): Promise<T | null> => {
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
   * Query data with pagination
   */
  page: async <T>(
    env: Env,
    table: string,
    where?: WhereCondition[],
    page = 1,
    size = 10
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
   * Insert data
   */
  insert: async (
    env: Env,
    table: string,
    data: Record<string, unknown>
  ): Promise<D1Result> => {
    const keys = Object.keys(data)
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys
      .map(() => '?')
      .join(', ')})`
    const values = Object.values(data)

    console.log('SQL:', sql, 'Values:', values)
    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .catch((error) => {
        console.error('insert failed', error, 'SQL:', sql, 'Values:', values)
        throw new Error('insert failed')
      })
  },

  /**
   * Update data
   */
  update: async (
    env: Env,
    table: string,
    data: Record<string, string | number>,
    where?: WhereCondition[]
  ): Promise<D1Result> => {
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
      .catch((error) => {
        console.error('update failed', error, 'SQL:', sql, 'Values:', values)
        throw new Error('update failed')
      })
  },

  /**
   * Delete data
   */
  delete: async (
    env: Env,
    table: string,
    where?: WhereCondition[]
  ): Promise<D1Result> => {
    let sql = `DELETE FROM ${table}`
    const { whereClause, values } = processWhere(where)
    sql += whereClause

    console.log('SQL:', sql, 'Values:', values)
    return env.DB.prepare(sql)
      .bind(...values)
      .run()
      .catch((error) => {
        console.error('delete failed', error, 'SQL:', sql, 'Values:', values)
        throw new Error('delete failed')
      })
  },
}
