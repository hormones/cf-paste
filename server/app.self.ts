import express from 'express'
import { createRequest, createContext } from './platforms/self'
import { IContext } from './types'
import { registerRoutes } from './router/routes'
import { router } from './router'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

registerRoutes()

const app = express()

// Configure middleware based on content type
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || ''
  // For file uploads, use raw body parser
  if (contentType.includes('application/octet-stream')) {
    express.raw()(req, res, next)
  } else if (req.path.startsWith('/api/')) {
    express.json()(req, res, next)
  } else {
    // For other requests, continue without parsing body
    next()
  }
})

// Serve static files first (before API routes)
app.use(express.static(path.join(__dirname, '../dist')))

// API routes - only for /api/* paths
app.all('/api/:path(*)', async (req: express.Request, res: express.Response) => {
  try {
    console.log('route request', req.path)
    const request = createRequest(req)
    const context = createContext(process.env) as IContext

    const apiResponse = await router.dispatch(request, context)

    if (apiResponse.headers) {
      Object.entries(apiResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value)
      })
    }

    if (request.clearCookie4auth) {
      res.clearCookie('authorization')
    }

    if (request.cookie4language) {
      res.cookie('language', request.cookie4language, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        sameSite: 'lax',
      })
    }

    res.status(apiResponse.status || 200).json({
      code: apiResponse.code,
      data: apiResponse.data,
      msg: apiResponse.msg,
    })
  } catch (error) {
    console.error('API execution error:', error)
    res.status(500).json({
      code: 500,
      msg: 'System error',
    })
  }
})

// Catch-all route for SPA - must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

const port = process.env.PORT || 3000
const host = process.env.HOST || 'localhost'

app.listen(port, () => {
  console.log(`Server running at http://${host}:${port}`)
})

export default app
