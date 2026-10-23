// API Client for Vibe AI Backend

export async function fetchHealth() {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) throw new Error(`Health check failed (${res.status})`)
    return await res.json()
  } catch (err) {
    return {
      status: 'error',
      hasKey: false,
      provider: 'none',
      message: err.message,
    }
  }
}

/**
 * Stream chat completion from the secure backend API.
 * Uses Server-Sent Events (SSE) over ReadableStream.
 */
export async function streamChatMessage({
  messages,
  tone = 'professional',
  signal,
  onChunk,
  onDone,
  onError,
}) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        tone,
      }),
      signal,
    })

    if (!response.ok) {
      let errorData = null
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: await response.text() }
      }

      const err = new Error(
        errorData?.message || `Request failed with status ${response.status}`
      )
      err.status = response.status
      err.code = errorData?.error
      err.setupInstructions = errorData?.setupInstructions
      throw err
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulatedText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const rawData = trimmed.replace(/^data:\s*/, '')
        if (rawData === '[DONE]') {
          continue
        }

        try {
          const parsed = JSON.parse(rawData)
          if (parsed.error) {
            throw new Error(parsed.error)
          }
          if (parsed.text) {
            accumulatedText += parsed.text
            if (onChunk) onChunk(parsed.text, accumulatedText)
          }
        } catch (e) {
          if (e.message.includes('API')) throw e
        }
      }
    }

    if (onDone) onDone(accumulatedText)
    return accumulatedText
  } catch (err) {
    if (signal?.aborted) {
      console.log('[Vibe AI] Request was cancelled by user.')
      return
    }
    if (onError) onError(err)
    throw err
  }
}

/**
 * Simulated stream for local preview/demo testing when no API key has been added yet.
 * Transparently labeled as Demo Mode so evaluation is clear and honest.
 */
export async function simulateDemoStream({
  prompt,
  tone = 'professional',
  signal,
  onChunk,
  onDone,
}) {
  let sampleResponse = ''

  if (tone === 'concise') {
    sampleResponse = `**Key Takeaways [Demo Mode - Add API Key for Live AI]:**

• **Objective:** Responding to: "${prompt.slice(0, 50)}..."
• **Action Point 1:** Tone is currently set to **Concise**, prioritizing high density and zero conversational fluff.
• **Action Point 2:** Real streaming is fully wired to \`/api/chat\` via Server-Sent Events (SSE).
• **Action Point 3:** To connect live Google Gemini or OpenAI responses, add \`GEMINI_API_KEY\` to your \`.env\` file.

\`\`\`javascript
// Example: API integration is ready
import { streamChatMessage } from './utils/api';
await streamChatMessage({ messages, tone: '${tone}' });
\`\`\`
Direct, fast, and structured.`
  } else if (tone === 'casual') {
    sampleResponse = `Hey there! 👋 *(Note: Demo preview mode - add your API key in .env for live Gemini/OpenAI)*

Great prompt: *"\\${prompt.slice(0, 45)}..."*! 

Since we have the **Casual** tone dialed in, I'm keeping things friendly, conversational, and super easy to digest!

Here is what makes this setup awesome:
1. **Real SSE streaming:** Tokens appear smoothly in real-time.
2. **Persistent memory:** All your chats stay right here in \`localStorage\`.
3. **Multi-tone adaptability:** Toggle between Casual, Professional, or Concise whenever you want!

\`\`\`bash
# Ready for real AI? Just add your free key in .env:
GEMINI_API_KEY=AIzaSy...
\`\`\`

Let me know what else you want to explore or test! 😊`
  } else {
    sampleResponse = `### Executive Summary & Analysis *(Demo Preview Mode)*

Thank you for your inquiry: *"\\${prompt.slice(0, 50)}..."*

In **Professional Tone** mode, Vibe AI formats responses with rigorous structure, analytical depth, and corporate clarity.

#### Strategic Architecture:
1. **Secure API Decoupling:** Client requests interface with an isolated backend proxy (\`/api/chat\`), preventing frontend credential exposure.
2. **Real-time Event Streaming:** Responses leverage HTTP chunked Server-Sent Events (SSE) for fluid token delivery.
3. **Session Persistence:** State is safely retained across client reloads via structured \`localStorage\` transactions.

\`\`\`json
{
  "status": "ready",
  "tone": "professional",
  "features": ["SSE Streaming", "LocalStorage Persistence", "Multi-Tone System", "Copy & Regenerate"]
}
\`\`\`

*To transition from Demo Preview to live models, configure your \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in \`.env\`.*`
  }

  // Stream word by word with slight delay
  const words = sampleResponse.split(' ')
  let current = ''

  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return
    const chunk = (i === 0 ? '' : ' ') + words[i]
    current += chunk
    if (onChunk) onChunk(chunk, current)
    await new Promise((resolve) => setTimeout(resolve, 24))
  }

  if (onDone) onDone(current)
  return current
}
