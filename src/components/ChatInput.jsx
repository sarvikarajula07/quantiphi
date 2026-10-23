import { useState, useRef, useEffect } from 'react'
import { SendIcon, StopIcon } from './Icons'
import { TONES } from '../constants'

export default function ChatInput({
  onSendMessage,
  onStopGeneration,
  isGenerating = false,
  activeTone = 'professional',
  onToneChange,
  placeholder,
}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  const currentTone = TONES[activeTone] || TONES.professional

  // Auto-resize textarea as text grows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 180)
    el.style.height = `${newHeight}px`
  }, [input])

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isGenerating) return

    onSendMessage(trimmed)
    setInput('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="chat-input-wrapper">
      <form onSubmit={handleSubmit} className="input-form-card">
        {/* Top bar inside input: Active tone & quick hints */}
        <div className="input-meta-bar">
          <div className="tone-indicator-tag">
            <span className="meta-icon">{currentTone.icon}</span>
            <span className="meta-tone-text">
              Generating in <strong>{currentTone.label}</strong> tone
            </span>
          </div>
          <div className="input-shortcut-hint">
            <span>Enter ↵ to send • Shift+Enter for newline</span>
          </div>
        </div>

        {/* Input box */}
        <div className="input-row">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || currentTone.placeholder}
            className="chat-textarea"
            disabled={isGenerating}
            aria-label="Message Vibe AI"
          />

          <div className="input-actions-right">
            {isGenerating ? (
              <button
                type="button"
                className="input-btn stop-btn"
                onClick={onStopGeneration}
                title="Stop streaming response"
                aria-label="Stop response"
              >
                <StopIcon className="w-4 h-4" />
                <span className="stop-text">Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={`input-btn send-btn ${input.trim() ? 'active' : ''}`}
                title="Send message"
                aria-label="Send message"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
