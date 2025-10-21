import { IRequest } from "../types"
import { detectMimeType as detectMimeFromShared, FALLBACK_MIME } from "../../shared/utils/mime"

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

  buildContentDisposition(filename: string): string {
    const sanitized = filename
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]+/g, '')
      .replace(/["\\]/g, '_')
      .trim()
    const fallbackName = sanitized.length > 0 ? sanitized : 'download'
    const encoded = encodeURIComponent(filename)
      .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
      .replace(/%(7C|5E|60)/g, (match) => match.toLowerCase())
    return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encoded}`
  },
}
