import CryptoJS from 'crypto-js'
import { argon2id } from '@noble/hashes/argon2'

interface CookieOptions {
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
  'max-age'?: number
}

// 设置 cookie 的选项
const cookieOptions: CookieOptions = {
  path: '/',
  httpOnly: true,
  secure: true, // 仅在 HTTPS 下发送
  sameSite: 'Lax', // 改为Lax，允许下载链接等GET请求携带cookie
  // maxAge: 7 * 24 * 60 * 60, // 7天过期
}

export const Auth = {
  getCookie(request: Request, name: string): string | null {
    // 获取cookie
    const cookies = request.headers.get('Cookie')
    if (!cookies) return null
    const cookie = cookies.split(';').find((c) => c.trim().startsWith(`${name}=`))
    return cookie ? cookie.split('=')[1] : null
  },
  setCookie(response: Response, name: string, value: string, maxAge?: number) {
    let cookie = `${name}=${value}`
    const finalOptions: CookieOptions = { ...cookieOptions }
    if (maxAge) {
      finalOptions['max-age'] = maxAge
    }

    for (const [key, val] of Object.entries(finalOptions)) {
      cookie += `; ${key}=${val}`
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
   * 使用Argon2id哈希密码
   * @param password 原始密码
   * @param word 关键词，用作salt的一部分
   * @param env 环境变量，包含AUTH_KEY用作额外的salt
   * @returns Base64编码的哈希值
   */
  hashPassword: async (password: string, word: string, env: Env): Promise<string> => {
    // 构建salt：AUTH_KEY + word，确保唯一性和安全性
    const saltInput = `${env.AUTH_KEY}:${word}`
    const salt = new TextEncoder().encode(saltInput)

    // 使用Argon2id进行哈希
    const passwordBytes = new TextEncoder().encode(password)
    const hashBytes = argon2id(passwordBytes, salt, {
      t: 3,
      m: 65536,
      p: 4,
      dkLen: 32,
    })

    // 将Uint8Array转换为Base64字符串以便存储
    return btoa(String.fromCharCode.apply(null, Array.from(hashBytes)))
  },
  /**
   * 验证密码
   * @param password 用户输入的密码
   * @param hashedPassword Base64编码的哈希密码
   * @param word 关键词
   * @param env 环境变量
   * @returns 验证结果
   */
  verifyPassword: async (password: string, hashedPassword: string, word: string, env: Env): Promise<boolean> => {
    try {
      // 重新计算哈希
      const computedHash = await Auth.hashPassword(password, word, env)
      // 直接比较两个Base64字符串
      return computedHash === hashedPassword
    } catch (error) {
      console.error('Password verification failed:', error)
      return false
    }
  },
}
