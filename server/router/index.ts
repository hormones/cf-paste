import { IRequest, IContext, ApiResponse, Route, Middleware } from '../types'

export class Router {
  private routes: Route[] = []

  register(route: Route): void {
    this.routes.push(route)
  }

  async dispatch(req: IRequest, ctx: IContext): Promise<ApiResponse> {
    const route = this.matchRoute(req.method, req.path)

    if (!route) {
      return {
        code: 404,
        msg: req.t('errors.resourceNotFound'),
        status: 404,
      }
    }

    req.params = this.extractParams(req.path)

    const middlewareChain = [...(route.middleware || []), route.handler]
    return await this.executeMiddlewareChain(middlewareChain, req, ctx)
  }

  private matchRoute(method: string, path: string): Route | null {

    for (const route of this.routes) {
      if (route.method !== method) continue

      if (this.pathMatches(route.path, path)) {
        return route
      }
    }

    return null
  }

  private pathMatches(pattern: string, path: string): boolean {
    // 移除查询参数部分
    const pathWithoutQuery = path.split('?')[0]

    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = pathWithoutQuery.split('/').filter(Boolean)

    if (patternParts.length !== pathParts.length) return false

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) continue
      if (patternParts[i] !== pathParts[i]) return false
    }

    return true
  }

  private extractParams(path: string): Record<string, string> {
    const params: Record<string, string> = {}
    const sp = path.split('?')
    if (sp.length > 1) {
      const query = sp[1]
      const queryParams = query.split('&')
      for (const param of queryParams) {
        const [key, value] = param.split('=')
        params[key] = value
      }
    }
    return params
  }

  private async executeMiddlewareChain(
    middlewareChain: (Middleware | Route['handler'])[],
    req: IRequest,
    ctx: IContext
  ): Promise<ApiResponse> {
    let index = 0

    const next = async (): Promise<ApiResponse> => {
      if (index >= middlewareChain.length) {
        throw new Error('Middleware chain exhausted')
      }

      const current = middlewareChain[index++]

      if (typeof current === 'function' && current.length === 3) {
        return await (current as Middleware)(req, ctx, next)
      } else {
        return await (current as Route['handler'])(req, ctx)
      }
    }

    return await next()
  }
}

export const router = new Router()
