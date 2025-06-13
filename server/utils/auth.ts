import CryptoJS from 'crypto-js'

// 设置 cookie 的选项
const cookieOptions = {
  path: '/',
  httpOnly: true,
  secure: true, // 仅在 HTTPS 下发送
  sameSite: 'Strict',
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
  setCookie(response: Response, name: string, value: string) {
    const cookie = Object.entries(cookieOptions).reduce((acc, [key, value]) => {
      return `${acc}; ${key.replace(/([A-Z])/g, '-$1').toLowerCase()}=${value}`
    }, `${name}=${value}`)
    response.headers.append('Set-Cookie', cookie)
  },
  clearCookie(response: Response, ...names: string[]) {
    names.forEach((name) => {
      response.headers.append(
        'Set-Cookie',
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`,
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
