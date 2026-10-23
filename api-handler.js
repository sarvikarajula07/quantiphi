import fs from 'node:fs'
import path from 'node:path'

// Helper to load .env manually without external dependencies
export function loadEnv(rootDir = process.cwd()) {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    const fullPath = path.resolve(rootDir, file)
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8')
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim()
            let val = trimmed.slice(eqIdx + 1).trim()
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1)
            }
            if (!process.env[key]) {
              process.env[key] = val
            }
          }
        }
      } catch (err) {
        console.warn(`[Vibe AI Backend] Warning reading ${file}:`, err.message)
      }
    }
  }
}

// Tone system prompt definitions
export const SYSTEM_PROMPTS = {
  professional:
    'You are Vibe AI, an executive-level, professional, and articulate AI assistant. Deliver comprehensive, structured, and insightful responses. Use formal terminology, structured paragraphs, clear bullet points where appropriate, and reasoned analysis suitable for workplace and enterprise communication.',
  casual:
    'You are Vibe AI, a friendly, warm, conversational, and helpful companion. Respond in an approachable, engaging, and upbeat voice. Use relatable analogies, natural dialogue, and clear explanations.',
  concise:
    'You are Vibe AI, an ultra-concise, direct, and efficient assistant. Get straight to the point. Provide punchy, actionable answers with bullet points, zero fluff, and no unnecessary filler. Prioritize speed of comprehension.',
}

export function getApiConfig() {
  loadEnv()
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  const openaiKey = process.env.OPENAI_API_KEY?.trim()

  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    return { provider: 'gemini', key: geminiKey }
  }
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    return { provider: 'openai', key: openaiKey }
  }
  return { provider: null, key: null }
}

// Parse request body safely
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 5 * 1024 * 1024) {
        // 5MB limit
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (err) {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

// Handle Google Gemini SSE streaming
async function streamGemini({ key, messages, tone, res, reqSignal }) {
  const systemPrompt = SYSTEM_PROMPTS[tone] || SYSTEM_PROMPTS.professional

  // Format messages for Gemini API
  // Gemini expects contents with parts and role: 'user' | 'model'
  const contents = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  // Try gemini-2.5-flash first, fallback to gemini-1.5-flash if needed
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash']
  let lastError = null

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
        key
      )}`

      const payload = {
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: tone === 'concise' ? 0.3 : tone === 'casual' ? 0.8 : 0.6,
          maxOutputTokens: 2048,
        },
      }

      const upstreamRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: reqSignal,
      })

      if (!upstreamRes.ok) {
        const errorText = await upstreamRes.text()
        lastError = new Error(`Gemini API Error (${model}) [${upstreamRes.status}]: ${errorText}`)
        // If 404 on model, try next model
        if (upstreamRes.status === 404 && model !== models[models.length - 1]) {
          continue
        }
        throw lastError
      }

      // Stream SSE data
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      const reader = upstreamRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const jsonStr = trimmed.replace(/^data:\s*/, '')
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const parsed = JSON.parse(jsonStr)
            const chunkText =
              parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
            if (chunkText) {
              res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`)
            }
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }

      res.write('data: [DONE]\n\n')
      res.end()
      return
    } catch (err) {
      if (reqSignal?.aborted) return
      lastError = err
      if (model === models[models.length - 1]) {
        throw lastError
      }
    }
  }
}

// Handle OpenAI SSE streaming
async function streamOpenAI({ key, messages, tone, res, reqSignal }) {
  const systemPrompt = SYSTEM_PROMPTS[tone] || SYSTEM_PROMPTS.professional

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
  ]

  const upstreamRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      stream: true,
      temperature: tone === 'concise' ? 0.3 : tone === 'casual' ? 0.8 : 0.6,
    }),
    signal: reqSignal,
  })

  if (!upstreamRes.ok) {
    const errorText = await upstreamRes.text()
    throw new Error(`OpenAI API Error [${upstreamRes.status}]: ${errorText}`)
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const reader = upstreamRes.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const dataStr = trimmed.replace(/^data:\s*/, '')
      if (dataStr === '[DONE]') {
        res.write('data: [DONE]\n\n')
        continue
      }
      try {
        const parsed = JSON.parse(dataStr)
        const chunkText = parsed.choices?.[0]?.delta?.content || ''
        if (chunkText) {
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`)
        }
      } catch (e) {
        // Ignore partial chunk parse error
      }
    }
  }

  res.write('data: [DONE]\n\n')
  res.end()
}

// Main HTTP request dispatcher
export async function handleApiRequest(req, res) {
  // Enable CORS headers for development flexibility
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return true
  }

  const url = new URL(req.url, 'http://localhost')

  // GET /api/health
  if (url.pathname === '/api/health' && req.method === 'GET') {
    const { provider, key } = getApiConfig()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'Vibe AI Backend',
        hasKey: Boolean(key),
        provider: provider || 'none',
        instructions: key
          ? 'API key loaded and ready.'
          : 'To enable real AI streaming, add GEMINI_API_KEY or OPENAI_API_KEY to your .env file.',
      })
    )
    return true
  }

  // POST /api/chat
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    const abortController = new AbortController()
    req.on('close', () => {
      abortController.abort()
    })

    try {
      const body = await parseJsonBody(req)
      const { messages, tone = 'professional' } = body

      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            error: 'INVALID_REQUEST',
            message: 'A valid non-empty array of messages is required.',
          })
        )
        return true
      }

      const { provider, key } = getApiConfig()

      if (!key) {
        // Securely and honestly inform the user that no API key is configured
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            error: 'API_KEY_REQUIRED',
            message:
              'No AI API key found. Please create a .env file with GEMINI_API_KEY (free at https://aistudio.google.com/) or OPENAI_API_KEY.',
            setupInstructions:
              '1. In project root, copy .env.example to .env\n2. Add your GEMINI_API_KEY=...\n3. Restart dev server: npm run dev',
          })
        )
        return true
      }

      if (provider === 'gemini') {
        await streamGemini({
          key,
          messages,
          tone,
          res,
          reqSignal: abortController.signal,
        })
      } else if (provider === 'openai') {
        await streamOpenAI({
          key,
          messages,
          tone,
          res,
          reqSignal: abortController.signal,
        })
      }
      return true
    } catch (err) {
      console.error('[Vibe AI Backend Error]', err)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            error: 'AI_STREAM_ERROR',
            message: err.message || 'An unexpected error occurred while communicating with the AI service.',
          })
        )
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
        res.end()
      }
      return true
    }
  }

  return false
}
