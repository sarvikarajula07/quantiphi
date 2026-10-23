import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import {
  BotIcon,
  UserIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  ArrowDownIcon,
  AlertCircleIcon,
} from './Icons'
import { TONES } from '../constants'
import { formatTimestamp } from '../utils/storage'

function MessageItem({
  message,
  index,
  isLast,
  isGenerating,
  onRegenerate,
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isError = message.isError

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toneInfo = message.tone ? TONES[message.tone] : null

  return (
    <div
      className={`message-row ${isUser ? 'user-row' : 'assistant-row'} ${isError ? 'error-row' : ''}`}
    >
      <div className="message-wrapper">
        {/* Avatar */}
        <div className={`message-avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`}>
          {isUser ? <UserIcon className="w-4 h-4" /> : <BotIcon className="w-4 h-4" />}
        </div>

        {/* Bubble & Metadata */}
        <div className="message-main">
          <div className="message-header-line">
            <span className="sender-name">{isUser ? 'You' : 'Vibe AI'}</span>

            {!isUser && toneInfo && (
              <span className={`message-tone-tag tone-${toneInfo.id}`}>
                {toneInfo.icon} {toneInfo.label}
              </span>
            )}

            <span className="message-time">
              {formatTimestamp(message.timestamp || Date.now())}
            </span>
          </div>

          <div className={`message-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
            {isUser ? (
              <p className="user-text">{message.content}</p>
            ) : isError ? (
              <div className="error-content">
                <p className="error-text">{message.content}</p>
                {message.setupInstructions && (
                  <pre className="error-setup-box">{message.setupInstructions}</pre>
                )}
              </div>
            ) : (
              <div className="bot-content">
                <MarkdownRenderer content={message.content} />
                {isGenerating && isLast && (
                  <span className="streaming-cursor" aria-hidden="true">
                    ▋
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Footer for AI Messages */}
          {!isUser && !isGenerating && !isError && message.content && (
            <div className="message-actions">
              <button
                type="button"
                className="action-btn"
                onClick={handleCopy}
                title="Copy entire response"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-success" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="action-btn"
                onClick={() => onRegenerate(index)}
                title="Regenerate this response with current tone"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            </div>
          )}

          {/* Error Retry Action */}
          {isError && !isGenerating && (
            <div className="message-actions">
              <button
                type="button"
                className="action-btn retry-btn"
                onClick={() => onRegenerate(index)}
                title="Retry sending message"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span>Retry Message</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessageList({
  messages = [],
  isGenerating = false,
  onRegenerate,
}) {
  const containerRef = useRef(null)
  const bottomRef = useRef(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const isAutoScrollActive = useRef(true)

  // Scroll detection: if user manually scrolls up, pause auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceToBottom = scrollHeight - scrollTop - clientHeight

    if (distanceToBottom > 80) {
      isAutoScrollActive.current = false
      setShowScrollBottom(true)
    } else {
      isAutoScrollActive.current = true
      setShowScrollBottom(false)
    }
  }

  // Smooth scroll to bottom
  const scrollToBottom = (behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }

  // Auto scroll effect on new messages or generation updates
  useEffect(() => {
    if (isAutoScrollActive.current) {
      scrollToBottom(isGenerating ? 'auto' : 'smooth')
    }
  }, [messages, isGenerating])

  return (
    <div
      className="message-list-container"
      ref={containerRef}
      onScroll={handleScroll}
    >
      <div className="messages-inner">
        {messages.map((message, index) => (
          <MessageItem
            key={message.id || index}
            message={message}
            index={index}
            isLast={index === messages.length - 1}
            isGenerating={isGenerating}
            onRegenerate={onRegenerate}
          />
        ))}

        {/* Typing indicator when generating before first token */}
        {isGenerating &&
          (messages.length === 0 ||
            messages[messages.length - 1]?.role === 'user') && (
            <div className="message-row assistant-row">
              <div className="message-wrapper">
                <div className="message-avatar bot-avatar">
                  <BotIcon className="w-4 h-4" />
                </div>
                <div className="message-main">
                  <div className="message-bubble bot-bubble typing-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            </div>
          )}

        <div ref={bottomRef} className="scroll-anchor" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          className="scroll-to-bottom-btn"
          onClick={() => {
            isAutoScrollActive.current = true
            scrollToBottom('smooth')
            setShowScrollBottom(false)
          }}
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
        >
          <ArrowDownIcon className="w-4 h-4" />
          <span>Latest</span>
        </button>
      )}
    </div>
  )
}
