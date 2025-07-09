import { t } from '../i18n'

export function newResponse<T>({
  code = 0,
  data = null,
  msg,
  status = 200,
}: {
  status?: number
} & ApiResponse<T>, language?: string): Response {
  const json: ApiResponse<T> = {
    code,
    data,
    msg: msg || t('messages.success', language || 'en')
  }
  return new Response(JSON.stringify(json), { status })
}
