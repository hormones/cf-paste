import { IRequest, IContext, ApiResponse, Middleware } from '../types'
import { Crypto } from '../utils/crypto'
import { Utils } from '../utils'

/**
 * Admin authentication middleware
 * Validates HttpOnly Cookie or Authorization header for admin access
 */
export const adminAuthMiddleware: Middleware = async (req: IRequest, ctx: IContext, next) => {
  try {
    const now = Date.now()
    let adminToken = ''

    // Try to get token from HttpOnly Cookie first
    const cookieToken = Utils.getCookie(req, 'admin_token')
    if (cookieToken) {
      adminToken = cookieToken
    } else {
      // Fallback to Authorization header
      const authHeader = req.getHeader('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        adminToken = authHeader.substring(7)
      }
    }

    if (!adminToken) {
      return {
        code: 401,
        msg: 'Admin authentication required',
        status: 401
      }
    }

    // Decrypt and validate token
    let decryptedToken: string
    try {
      decryptedToken = await Crypto.decrypt(ctx.config.AUTH_KEY, adminToken)
    } catch (err) {
      console.error('Failed to decrypt admin token:', err)
      return {
        code: 401,
        msg: 'Invalid admin token',
        status: 401
      }
    }

    // Parse token format: "admin:timestamp"
    const [tokenType, timestampStr] = decryptedToken.split(':')

    if (tokenType !== 'admin') {
      return {
        code: 403,
        msg: 'Invalid admin token format',
        status: 403
      }
    }

    const timestamp = parseInt(timestampStr)
    if (isNaN(timestamp)) {
      return {
        code: 403,
        msg: 'Invalid admin token timestamp',
        status: 403
      }
    }

    // Check token expiration (1 day = 24 * 60 * 60 * 1000 ms)
    const TOKEN_EXPIRY = 24 * 60 * 60 * 1000
    if (now - timestamp > TOKEN_EXPIRY) {
      return {
        code: 401,
        msg: 'Admin token expired',
        status: 401
      }
    }

    // Inject admin identity marker into request
    req.isAdmin = true
    req.adminTokenTimestamp = timestamp

    console.log('Admin authentication successful')
    return await next()
  } catch (err) {
    console.error('Admin authentication failed:', err)
    return {
      code: 500,
      msg: 'Admin authentication error',
      status: 500
    }
  }
}