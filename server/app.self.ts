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

let maxFileSize = process.env.MAX_UPLOAD_SIZE || '100mb'
if (process.env.MAX_FILE_SIZE) {
  maxFileSize = `${process.env.MAX_FILE_SIZE}mb`
}

// Configure middleware based on content type
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || ''

  // Debug logging for chunk uploads
  if (req.path.includes('multipart/chunk')) {
    console.log('Chunk upload - Content-Type:', contentType, 'Path:', req.path)
    console.log('Skipping body parsing for streaming')
    // For chunk uploads, completely skip body parsing to enable true streaming
    // Mark the request to indicate we want streaming
    ;(req as any)._streamingMode = true
    next()
    return
  }

  // For other file uploads, use raw body parser with increased limits
  if (contentType.includes('application/octet-stream')) {
    // Configurable limit for file uploads
    express.raw({ limit: maxFileSize })(req, res, next)
  } else if (req.path.startsWith('/api/')) {
    express.json({ limit: '10mb' })(req, res, next)
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
    console.log('route request', req.method, req.path)
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
