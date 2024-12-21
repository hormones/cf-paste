import { newErrorResponse } from './utils/response'
import { D1 } from './bindings/d1'
import { Keyword } from './types/worker-configuration'

async function errorHandling(context) {
  try {
    return await context.next()
  } catch (error) {
    return newErrorResponse({ error, status: 500 })
  }
}

async function authentication(context) {
  const word = context.request.headers['x-word']
  const auth = context.request.headers['x-auth']
  const data = await D1.first<Keyword | null>(context.env, 'keyword', [
    { key: 'word', value: word },
  ])
  if (!data) {
    return newErrorResponse({ msg: '数据不存在', status: 403 })
  }
  if (data.password !== auth) {
    return newErrorResponse({ msg: '密码错误', status: 403 })
  }
  return context.next()
}

export const onRequest = [errorHandling, authentication]
