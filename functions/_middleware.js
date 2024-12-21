import { newErrorResponse } from './utils/response'

async function errorHandling(context) {
  try {
    return await context.next()
  } catch (error) {
    return newErrorResponse({ error, status: 500 })
  }
}

function authentication(context) {
  const keyword = context.request.headers.get['x-keyword']
  if (keyword !== 'test') {
    return newErrorResponse({ msg: '密码错误', status: 403 })
  }
  return context.next()
}

export const onRequest = [errorHandling, authentication]
