import express from 'express'
import { createRequest, createContext } from './platforms/self'
import { IContext } from './types'
import { registerRoutes } from './router/routes'
import { router } from './router'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// check env config AUTH_KEY
// console.log(process.env)
if (!process.env.AUTH_KEY) {
  console.error('AUTH_KEY is not set!')
  process.exit(1)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

registerRoutes()

const app = express()

// Configure middleware based on content type
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || ''

  // For json requests
  if (contentType.includes('application/json')) {
    express.json()(req, res, next)
  } else {
    next()
  }
})

// Serve static files first (before API routes)
app.use(express.static(path.join(__dirname, '../dist')))

// API routes - only for /api/* paths
app.all('/api/:path(*)', async (req: express.Request, res: express.Response) => {
  try {
    console.log('route request', req.method, req.path)
    const context = createContext(process.env) as IContext
    const request = createRequest(req, context)

    const apiResponse = await router.dispatch(request, context)

    if (apiResponse.headers) {
      Object.entries(apiResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value)
      })
    }

    if (request.clearCookie4auth) {
      res.clearCookie('auth')
    }

    if (request.cookie4language) {
      res.cookie('language', request.cookie4language, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        sameSite: 'lax',
      })
    }

    // Handle streaming responses
    if (apiResponse.streaming && apiResponse.data) {
      // For streaming responses, send the stream directly
      res.status(apiResponse.status || 200)

      // The data should be a ReadableStream
      if (apiResponse.data && typeof apiResponse.data.getReader === 'function') {
        const reader = apiResponse.data.getReader()

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                res.end()
                break
              }
              res.write(Buffer.from(value))
            }
          } catch (error) {
            console.error('Streaming error:', error)
            res.end()
          }
        }

        pump()
      } else {
        // Fallback for non-stream data
        res.end()
      }
    } else {
      // Regular JSON response
      res.status(apiResponse.status || 200).json({
        code: apiResponse.code,
        data: apiResponse.data,
        msg: apiResponse.msg,
      })
    }
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
