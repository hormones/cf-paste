import { IRequest, IContext, ApiResponse } from '../../types'
import { AdminAuthRequest, AdminAuthResponse } from '../../../shared/types/admin'
import { Crypto } from '../../utils/crypto'
import { Utils } from '../../utils'

/**
 * Handle admin authentication
 * POST /api/admin/auth
 */
export async function handleVerify(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    const { password }: AdminAuthRequest = await req.json()

    // Validate input
    if (!password || password.length < 6) {
      return {
        code: 400,
        msg: 'Password is required and must be at least 6 characters',
        status: 400
      }
    }

    // Get admin password from environment variables
    const adminPassword = ctx.config.ADMIN_DASH_PASSWORD
    if (!adminPassword) {
      console.error('ADMIN_DASH_PASSWORD not configured')
      return {
        code: 500,
        msg: 'Admin authentication not configured',
        status: 500
      }
    }

    // Constant-time password comparison to prevent timing attacks
    const isValidPassword = await constantTimeCompare(password, adminPassword)

    if (!isValidPassword) {
      // Add small delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 1000))
      return {
        code: 401,
        msg: 'Invalid admin password',
        status: 401
      }
    }

    // Generate AES encrypted token with format: "admin:timestamp"
    const timestamp = Date.now()
    const tokenPayload = `admin:${timestamp}`
    const encryptedToken = await Crypto.encrypt(ctx.config.AUTH_KEY, tokenPayload)

    // Set HttpOnly Cookie with admin token (path=/api/admin, 1 day expiry)
    const cookieHeader = Utils.setAdminCookie('admin_token', encryptedToken)

    const response: AdminAuthResponse = {
      success: true,
      message: 'Admin authentication successful',
      token: encryptedToken
    }

    console.log('Admin login successful')

    return {
      code: 0,
      data: response,
      headers: { 'Set-Cookie': cookieHeader }
    }
  } catch (error) {
    console.error('Admin authentication error:', error)
    return {
      code: 500,
      msg: 'Internal server error',
      status: 500
    }
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
async function constantTimeCompare(input: string, expected: string): Promise<boolean> {
  // Ensure both strings are the same length for constant-time comparison
  if (input.length !== expected.length) {
    // Still perform comparison to maintain constant time
    let result = 0
    for (let i = 0; i < Math.max(input.length, expected.length); i++) {
      const a = i < input.length ? input.charCodeAt(i) : 0
      const b = i < expected.length ? expected.charCodeAt(i) : 0
      result |= a ^ b
    }
    return false
  }

  let result = 0
  for (let i = 0; i < input.length; i++) {
    result |= input.charCodeAt(i) ^ expected.charCodeAt(i)
  }

  return result === 0
}

/**
 * Handle admin logout
 * POST /api/admin/logout
 */
export async function handleLogout(req: IRequest, ctx: IContext): Promise<ApiResponse> {
  try {
    // Clear admin cookie by setting it to expire immediately
    const expiredCookieHeader = Utils.clearAdminCookie('admin_token')

    const response = {
      success: true,
      message: 'Admin logout successful'
    }

    console.log('Admin logout successful')

    return {
      code: 0,
      data: response,
      headers: { 'Set-Cookie': expiredCookieHeader }
    }
  } catch (error) {
    console.error('Admin logout error:', error)
    return {
      code: 500,
      msg: 'Internal server error',
      status: 500
    }
  }
}
