import CryptoJS from 'crypto-js'

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
}
