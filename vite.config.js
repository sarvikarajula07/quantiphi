import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { handleApiRequest } from './api-handler.js'

function vibeAiApiPlugin() {
  return {
    name: 'vibe-ai-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          try {
            const handled = await handleApiRequest(req, res)
            if (handled) return
          } catch (err) {
            console.error('[API Middleware Error]', err)
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
            return
          }
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          try {
            const handled = await handleApiRequest(req, res)
            if (handled) return
          } catch (err) {
            console.error('[API Middleware Error]', err)
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
            return
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vibeAiApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
})
