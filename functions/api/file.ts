import { AutoRouter } from 'itty-router'
import { R2 } from '../bindings/r2'

const router = AutoRouter({ base: '/api/file' })

router.get('/download', async (request, env) => {
  // 从header中获取prefix
  const keyword = request.headers['x-keyword']
  return R2.download(env, {
    prefix: keyword,
    name: 'test.txt',
  })
})

export default { ...router }
