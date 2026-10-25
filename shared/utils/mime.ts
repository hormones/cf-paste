export type PreviewCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'markdown'
  | 'text'
  | 'unsupported'

const FALLBACK_MIME = 'application/octet-stream'

const normalizeMimeType = (mimeType: string | undefined): string => {
  if (!mimeType) return ''
  const [base] = mimeType.split(';', 1)
  return base.trim().toLowerCase()
}

const extensionToMime: Record<string, string> = {
  txt: 'text/plain; charset=utf-8',
  log: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  markdown: 'text/markdown; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json',
  json5: 'application/json',
  yaml: 'text/yaml; charset=utf-8',
  yml: 'text/yaml; charset=utf-8',
  xml: 'application/xml',
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  svg: 'image/svg+xml',
  js: 'application/javascript',
  mjs: 'application/javascript',
  cjs: 'application/javascript',
  ts: 'application/typescript',
  tsx: 'text/plain; charset=utf-8',
  jsx: 'text/plain; charset=utf-8',
  css: 'text/css; charset=utf-8',
  scss: 'text/x-scss; charset=utf-8',
  less: 'text/x-less; charset=utf-8',
  sh: 'application/x-sh',
  bash: 'application/x-sh',
  conf: 'text/plain; charset=utf-8',
  ini: 'text/plain; charset=utf-8',
  env: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  m4v: 'video/x-m4v',
  avi: 'video/x-msvideo',
  pdf: 'application/pdf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

const markdownExtensions = new Set(['md', 'markdown'])
const textExtensions = new Set([
  'txt',
  'csv',
  'json',
  'json5',
  'yaml',
  'yml',
  'xml',
  'log',
  'ini',
  'conf',
  'env',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'css',
  'scss',
  'less',
  'html',
  'htm',
  'svg',
  'sh',
  'bash',
])
const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico'])
const audioExtensions = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'])
const videoExtensions = new Set(['mp4', 'webm', 'ogg', 'mov', 'mkv', 'm4v', 'avi'])

const textLikeMimes = new Set([
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/typescript',
  'application/x-sh',
  'application/x-shellscript',
  'application/csv',
  'application/x-yaml',
])

export const getFileExtension = (filename: string | undefined): string => {
  if (!filename) return ''
  const parts = filename.split('.')
  if (parts.length <= 1) return ''
  return parts.pop()!.toLowerCase()
}

export const detectMimeType = (
  filename: string | undefined,
  fallback: string = FALLBACK_MIME
): string => {
  const ext = getFileExtension(filename)
  if (!ext) {
    return fallback
  }
  return extensionToMime[ext] || fallback
}

export const inferMimeType = (
  filename: string | undefined,
  explicitMime?: string
): string => {
  if (explicitMime && explicitMime.trim()) {
    return explicitMime.toLowerCase()
  }
  return detectMimeType(filename).toLowerCase()
}

export const getPreviewCategoryByMime = (
  mimeType: string,
  extension: string
): PreviewCategory => {
  const normalizedMimeType = normalizeMimeType(mimeType) || mimeType

  if (normalizedMimeType.startsWith('image/')) return 'image'
  if (normalizedMimeType.startsWith('video/')) return 'video'
  if (normalizedMimeType.startsWith('audio/')) return 'audio'
  if (normalizedMimeType === 'application/pdf') return 'pdf'
  if (normalizedMimeType === 'text/markdown' || normalizedMimeType === 'application/markdown')
    return 'markdown'
  if (normalizedMimeType.startsWith('text/') || textLikeMimes.has(normalizedMimeType)) return 'text'

  if (markdownExtensions.has(extension)) return 'markdown'
  if (imageExtensions.has(extension)) return 'image'
  if (videoExtensions.has(extension)) return 'video'
  if (audioExtensions.has(extension)) return 'audio'
  if (extension === 'pdf') return 'pdf'
  if (textExtensions.has(extension)) return 'text'

  return 'unsupported'
}

export const getPreviewCategory = (
  name: string | undefined,
  contentType?: string
): PreviewCategory => {
  const mimeType = inferMimeType(name, contentType)
  const extension = getFileExtension(name)
  return getPreviewCategoryByMime(mimeType, extension)
}

export const isPreviewSupported = (
  name: string | undefined,
  contentType?: string
): boolean => {
  return getPreviewCategory(name, contentType) !== 'unsupported'
}

export const isTextCategory = (category: PreviewCategory): boolean =>
  category === 'text' || category === 'markdown'

export { FALLBACK_MIME }
