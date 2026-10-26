import { IRequest } from "../types"
import { detectMimeType as detectMimeFromShared, FALLBACK_MIME } from "../../shared/utils/mime"

/**
 * Build an ASCII-only fallback filename that keeps the original extension.
 * "测试文档.txt" -> "download.txt" (not ".txt", not "download"), so a browser
 * that ignores the RFC 5987 `filename*` parameter still saves a .txt rather
 * than falling back to the content-type extension (.bin for octet-stream).
 */
export function buildAsciiFallbackName(filename: string): string {
  const dot = filename.lastIndexOf('.')
  const hasExt = dot > 0 && dot < filename.length - 1
  const basePart = hasExt ? filename.slice(0, dot) : filename
  const extPart = hasExt ? filename.slice(dot + 1) : ''

  const toAscii = (value: string): string =>
    value
      .normalize('NFKD')
      // Drop combining marks so "café" -> "cafe" instead of "caf"
      .replace(/[\u0300-\u036f]/g, '')
      // Strip everything outside printable ASCII
      .replace(/[^\x20-\x7E]+/g, '')
      // Header-unsafe characters
      .replace(/["\\;]/g, '_')
      // Collapse runs of whitespace and trim leftover separators
      .replace(/\s+/g, ' ')
      .replace(/^[\s._-]+|[\s._-]+$/g, '')
      .trim()

  const asciiBase = toAscii(basePart) || 'download'
  const asciiExt = toAscii(extPart)
  return asciiExt ? `${asciiBase}.${asciiExt}` : asciiBase
}

export const Utils = {
  /**
   * Generate random alphanumeric string with configurable options
   */
  getRandomWord(
    length: number,
    options: {
      uppercase?: boolean
      lowercase?: boolean
      numbers?: boolean
    } = {}
  ): string {
    const { uppercase = false, lowercase = true, numbers = true } = options

    let chars = ''
    if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (numbers) chars += '0123456789'

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789' // Default charset

    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },

  /**
   * Convert bytes to human readable file size
   */
  humanReadableSize(size: number) {
    if (size === 0) return '0 B'
    const i = Math.floor(Math.log(size) / Math.log(1024))
    return `${(size / Math.pow(1024, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`
  },

  /**
   * Parse Range request header
   * Supports formats: bytes=start-end, bytes=start-, bytes=-suffix
   */
  parseRange: (range: string, totalSize: number) => {
    if (!range || !range.startsWith('bytes=')) {
      return null
    }

    const rangeSpec = range.replace(/bytes=/, '')

    // Handle suffix-byte-range-spec (e.g., bytes=-500)
    if (rangeSpec.startsWith('-')) {
      const suffix = parseInt(rangeSpec.substring(1), 10)
      if (isNaN(suffix) || suffix <= 0) return null

      const start = Math.max(0, totalSize - suffix)
      return {
        start,
        end: totalSize - 1,
      }
    }

    // Handle byte-range-spec (e.g., bytes=200-1023 or bytes=200-)
    const [startStr, endStr] = rangeSpec.split('-')
    const start = parseInt(startStr, 10)

    if (isNaN(start) || start < 0) return null

    let end: number
    if (endStr === '' || endStr === undefined) {
      // bytes=200- (from start to end of file)
      end = totalSize - 1
    } else {
      end = parseInt(endStr, 10)
      if (isNaN(end) || end < start) return null
      // Ensure end doesn't exceed file size
      end = Math.min(end, totalSize - 1)
    }

    // Ensure start doesn't exceed file size
    if (start >= totalSize) return null

    return {
      start,
      end,
    }
  },
  /**
   * Parse a Range header that specifies both bounds (e.g. `bytes=0-499`).
   *
   * Returns null for open-ended (`bytes=0-`) and suffix (`bytes=-500`) forms,
   * because those require the real file size to resolve and the caller does not
   * know it yet. Forwarding a bogus total (Number.MAX_SAFE_INTEGER) makes the
   * storage adapters emit 416 for perfectly valid requests, which is what made
   * downloads show up as "-1 B" with unknown length. Serving the whole file
   * instead of a partial response is a valid, correct answer for those forms.
   */
  parseClosedRange: (range: string): { start: number; end: number } | null => {
    if (!range || !range.startsWith('bytes=')) {
      return null
    }

    const rangeSpec = range.replace(/^bytes=/, '')

    // Multi-range requests (bytes=0-1,5-6) are not supported; serve whole file.
    if (rangeSpec.includes(',')) {
      return null
    }

    // Open-ended (bytes=0-) and suffix (bytes=-500) need the real size.
    if (rangeSpec.endsWith('-') || rangeSpec.startsWith('-')) {
      return null
    }

    const [startStr, endStr] = rangeSpec.split('-')
    const start = parseInt(startStr, 10)
    const end = parseInt(endStr, 10)

    if (isNaN(start) || isNaN(end) || start < 0 || end < start) {
      return null
    }

    return { start, end }
  },
  extractPathVariables: (pattern: string, path: string): Record<string, string> => {
    const variables: Record<string, string> = {}
    const sp = path.split('?')
    path = sp[0]
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = path.split('/').filter(Boolean)
    if (patternParts.length !== pathParts.length) return variables
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const key = patternParts[i].substring(1)
        variables[key] = pathParts[i]
      }
    }
    return variables
  },
  getCookie: (req: IRequest, name: string): string | null => {
    const cookies = req.getHeader('Cookie')
    if (!cookies) return null
    const cookie = cookies.split(';').find((c) => c.trim().startsWith(`${name}=`))
    return cookie ? cookie.split('=')[1] : null
  },
  setCookie: (name: string, value: string, req: IRequest) => {
    const path = req.edit ? req.word : 'v/' + req.view_word
    return `${name}=${value}; Path=/api/${path}; HttpOnly; SameSite=Lax; Max-Age=86400`
  },
  clearCookie: (name: string, req: IRequest) => {
    const path = req.edit ? req.word : 'v/' + req.view_word
    return `${name}=; Path=/api/${path}; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  },
  setAdminCookie: (name: string, value: string) => {
    return `${name}=${value}; Path=/api/admin; HttpOnly; SameSite=Lax; Max-Age=86400`
  },
  clearAdminCookie: (name: string) => {
    return `${name}=; Path=/api/admin; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  },
  detectMimeType(filename: string, fallback = 'application/octet-stream'): string {
    return detectMimeFromShared(filename, fallback || FALLBACK_MIME)
  },

  buildContentDisposition(filename: string, disposition: 'inline' | 'attachment' = 'attachment'): string {
    // RFC 6266 allows two names: an ASCII `filename=` fallback and a UTF-8
    // `filename*=`. Some Android in-app browsers and WebView DownloadListeners
    // ignore `filename*` entirely and only read `filename=`, so the fallback
    // must never degrade into something useless like "download" or ".txt"
    // (the latter happens when only the extension survives stripping).
    const fallbackName = buildAsciiFallbackName(filename)
    const encoded = encodeURIComponent(filename)
      .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
      .replace(/%(7C|5E|60)/g, (match) => match.toLowerCase())
    return `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encoded}`
  },
}
