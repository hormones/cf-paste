export function newResponse<T>({
  code = 0,
  data = null,
  msg = 'success',
  status = 200,
}: {
  status?: number
} & ApiResponse<T>): Response {
  const json: ApiResponse<T> = { code, data, msg }
  return new Response(JSON.stringify(json), { status })
}
