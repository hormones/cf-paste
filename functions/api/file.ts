import { AutoRouter } from 'itty-router'
import { R2 } from '../bindings/r2'

const router = AutoRouter({ base: '/api/file' })

router.get('/download', async (request, env) => {
  // 从header中获取prefix
  const word = request.headers['x-word']
  return R2.download(env, {
    prefix: word,
    name: 'test.txt',
  })
})

export default { ...router }
