import { AutoRouter } from 'itty-router'
import { Env } from '../types/worker-configuration'
import { D1 } from '../bindings/d1'
import { newResponse } from '../utils/response'

const keyword = 'keyword'

const router = AutoRouter({ base: '/api/data' })

router.get('', async (request, env: Env) => {
  return D1.first(env, keyword, [{ key: 'word', value: env.word }]).then((data) =>
    newResponse({ data }),
  )
})

router.post('', async (request, env: Env) => {
  const data: Record<string, string | number> = await request.json()
  return D1.insert(env, keyword, data).then((data) => newResponse({ data }))
})

router.put('', async (request, env: Env) => {
  const data: Record<string, string | number> = await request.json()
  return D1.update(env, keyword, data, [{ key: 'word', value: env.word }])
})

router.delete('', async (request, env: Env) => {
  return D1.delete(env, keyword, [{ key: 'word', value: env.word }])
})

export default { ...router }
