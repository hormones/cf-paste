import CryptoJS from 'crypto-js'
import { argon2id } from '@noble/hashes/argon2'

interface CookieOptions {
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
  'max-age'?: number
}

const cookieOptions: CookieOptions = {
  path: '/',
  httpOnly: true,
  secure: false,
  sameSite: 'Lax', // Use Lax to allow GET requests like download links to carry cookies
  'max-age': 1 * 24 * 60 * 60, // 1 day expiry
}

export const Auth = {
  getCookie(request: Request, name: string): string | null {
    const cookies = request.headers.get('Cookie')
    if (!cookies) return null
    const cookie = cookies.split(';').find((c) => c.trim().startsWith(`${name}=`))
    return cookie ? cookie.split('=')[1] : null
  },
  setCookie(response: Response, name: string, value: string, options?: Partial<CookieOptions>) {
    let cookie = `${name}=${value}`
    const finalOptions = { ...cookieOptions, ...options }
    if (finalOptions) {
      for (const [key, val] of Object.entries(finalOptions)) {
        cookie += `; ${key}=${val}`
      }
    }

    response.headers.append('Set-Cookie', cookie)
  },
  clearCookie(response: Response, ...names: string[]) {
    names.forEach((name) => {
      response.headers.append(
        'Set-Cookie',
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
      )
    })
  },
  encrypt: async (env: Env, data: string) => {
    return CryptoJS.AES.encrypt(data, env.AUTH_KEY).toString()
  },
  decrypt: async (env: Env, data: string) => {
    return CryptoJS.AES.decrypt(data, env.AUTH_KEY).toString(CryptoJS.enc.Utf8)
  },
  /**
   * Hash password using Argon2id algorithm
   */
  hashPassword: async (password: string, word: string, env: Env): Promise<string> => {
    const startTime = Date.now()
    // Build salt: AUTH_KEY + word to ensure uniqueness and security
    const saltInput = `${env.AUTH_KEY}:${word}`
    const salt = new TextEncoder().encode(saltInput)

    const passwordBytes = new TextEncoder().encode(password)
    const hashBytes = argon2id(passwordBytes, salt, {
      t: 1,
      m: 6144,
      p: 1,
      dkLen: 32,
    })

    // Convert Uint8Array to Base64 string for storage
    const hashBase64 = btoa(String.fromCharCode.apply(null, Array.from(hashBytes)))
    console.log(`hash password for word [${word}]: ${Date.now() - startTime}ms`)
    return hashBase64
  },
  /**
   * Verify password against hashed password
   */
  verifyPassword: async (
    password: string,
    hashedPassword: string,
    word: string,
    env: Env
  ): Promise<boolean> => {
    try {
      const computedHash = await Auth.hashPassword(password, word, env)
      return computedHash === hashedPassword
    } catch (error) {
      console.error('Password verification failed:', error)
      return false
    }
  },
}
