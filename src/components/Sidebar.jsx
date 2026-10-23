import { useState } from 'react'
import {
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  MessageSquareIcon,
  CloseIcon,
  ShieldCheckIcon,
  KeyIcon,
} from './Icons'
import { formatTimestamp } from '../utils/storage'

export default function Sidebar({
  conversations = [],
  activeId = null,
  isOpen = true,
  onClose,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAll,
  apiStatus,
  onOpenApiModal,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const filteredConversations = conversations.filter((c) =>
    (c.title || 'New Conversation')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  )

  const handleDeleteClick = (e, id) => {
    e.stopPropagation()
    if (confirmDeleteId === id) {
      onDeleteConversation(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      setTimeout(() => {
        setConfirmDeleteId((prev) => (prev === id ? null : prev))
      }, 3000)
    }
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-logo-glow">
              <SparklesIcon className="w-5 h-5 text-accent" />
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Vibe AI</h1>
              <span className="brand-badge">Assessment v1.0</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New Chat */}
        <div className="sidebar-actions">
          <button
            type="button"
            className="new-chat-btn"
            onClick={() => {
              onNewChat()
              if (window.innerWidth <= 768) onClose()
            }}
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Chat</span>
            <kbd className="kbd-shortcut">Alt+N</kbd>
          </button>
        </div>

        {/* Filter / Search if conversations exist */}
        {conversations.length > 3 && (
          <div className="sidebar-search">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        )}

        {/* History List */}
        <div className="sidebar-history">
          <div className="history-label-row">
            <span className="history-section-title">Past Conversations</span>
            <span className="history-count">{conversations.length}</span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="sidebar-empty">
              {conversations.length === 0 ? (
                <>
                  <MessageSquareIcon className="w-8 h-8 text-muted" />
                  <p>No chat history yet.</p>
                  <span className="sidebar-empty-sub">
                    Start a new conversation and your history will be saved here automatically!
                  </span>
                </>
              ) : (
                <p>No conversations match &quot;{searchQuery}&quot;</p>
              )}
            </div>
          ) : (
            <div className="conversation-list">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === activeId
                const isConfirming = confirmDeleteId === conv.id
                return (
                  <div
                    key={conv.id}
                    className={`conversation-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectConversation(conv.id)
                      if (window.innerWidth <= 768) onClose()
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelectConversation(conv.id)
                    }}
                  >
                    <MessageSquareIcon className="conv-icon" />
                    <div className="conv-info">
                      <div className="conv-title" title={conv.title}>
                        {conv.title || 'New Conversation'}
                      </div>
                      <div className="conv-meta">
                        <span className="conv-time">
                          {formatTimestamp(conv.updatedAt || conv.createdAt)}
                        </span>
                        {conv.tone && (
                          <span className={`conv-tone-tag tone-${conv.tone}`}>
                            {conv.tone}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`conv-delete-btn ${isConfirming ? 'confirming' : ''}`}
                      title={isConfirming ? 'Click again to delete' : 'Delete conversation'}
                      onClick={(e) => handleDeleteClick(e, conv.id)}
                    >
                      {isConfirming ? (
                        <span className="delete-confirm-text">Delete?</span>
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {conversations.length > 0 && (
            <button
              type="button"
              className="clear-all-btn"
              onClick={onClearAll}
              title="Clear all stored conversation history"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          <div
            className={`api-status-banner ${apiStatus?.hasKey ? 'connected' : 'warning'}`}
            onClick={onOpenApiModal}
            role="button"
            tabIndex={0}
            title="Click to view API Configuration"
          >
            {apiStatus?.hasKey ? (
              <>
                <ShieldCheckIcon className="w-4 h-4 status-icon text-success" />
                <div className="status-text">
                  <span className="status-title">
                    Backend: {apiStatus.provider?.toUpperCase()}
                  </span>
                  <span className="status-sub">Secure SSE streaming active</span>
                </div>
              </>
            ) : (
              <>
                <KeyIcon className="w-4 h-4 status-icon text-warning" />
                <div className="status-text">
                  <span className="status-title">API Key Setup</span>
                  <span className="status-sub">Click for instructions</span>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
