const getUrlPrefix = () => {
  const path = window.location.pathname
  // 匹配 /:word/ 或 /v/:view_word/
  const match = path.match(/^\/([a-zA-Z0-9_]+)/) || path.match(/^\/(v\/[a-zA-Z0-9_]+)/)
  return match ? match[1] : ''
}

export default {
  urlPrefix: getUrlPrefix() + '/api',
}
