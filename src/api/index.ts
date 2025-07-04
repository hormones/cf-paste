const getUrlPrefix = () => {
  const path = window.location.pathname
  // 优先匹配 /v/xxx
  const viewMatch = path.match(/^\/v\/[a-zA-Z0-9_]+/)
  if (viewMatch) {
    return viewMatch[0]
  }
  // 再匹配 /xxx
  const wordMatch = path.match(/^\/[a-zA-Z0-9_]+/)
  if (wordMatch) {
    return wordMatch[0]
  }
  return ''
}

export default {
  urlPrefix: `${getUrlPrefix()}/api`,
}
