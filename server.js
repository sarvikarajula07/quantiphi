import http from 'node:http'
import { handleApiRequest, loadEnv } from './api-handler.js'

loadEnv()
const PORT = process.env.PORT || 3001

const server = http.createServer(async (req, res) => {
  try {
    const handled = await handleApiRequest(req, res)
    if (!handled) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'API route not found' }))
    }
  } catch (err) {
    console.error('[Server Error]', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: err.message }))
    }
  }
})

server.listen(PORT, () => {
  console.log(`✨ Vibe AI Backend listening on http://localhost:${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/api/health`)
  console.log(`   Chat endpoint: http://localhost:${PORT}/api/chat`)
})
