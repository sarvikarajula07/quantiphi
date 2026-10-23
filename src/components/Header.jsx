import { TONES } from '../constants'
import {
  MenuIcon,
  PlusIcon,
  DownloadIcon,
  ShieldCheckIcon,
  KeyIcon,
} from './Icons'

export default function Header({
  activeTone = 'professional',
  onToneChange,
  onToggleSidebar,
  onNewChat,
  onExportChat,
  hasMessages = false,
  apiStatus,
  onOpenApiModal,
}) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          type="button"
          className="header-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle Sidebar"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <div className="header-title-box">
          <div className="header-title-row">
            <span className="header-brand-name">Vibe AI</span>
            <span className="header-status-dot" title="System Ready" />
          </div>
          <span className="header-subtitle">
            Tone: <strong>{TONES[activeTone]?.label || 'Professional'}</strong>
          </span>
        </div>
      </div>

      {/* Tone Selection Bar */}
      <div className="header-center">
        <div className="tone-selector" role="group" aria-label="Response tone selection">
          {Object.values(TONES).map((tone) => {
            const isSelected = tone.id === activeTone
            return (
              <button
                key={tone.id}
                type="button"
                className={`tone-pill-btn ${isSelected ? 'active' : ''}`}
                onClick={() => onToneChange(tone.id)}
                title={tone.description}
                aria-pressed={isSelected}
              >
                <span className="tone-icon">{tone.icon}</span>
                <span className="tone-label">{tone.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="header-right">
        {hasMessages && (
          <button
            type="button"
            className="header-action-btn"
            onClick={onExportChat}
            title="Export conversation to Markdown"
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="btn-text-desktop">Export</span>
          </button>
        )}

        <button
          type="button"
          className="header-action-btn new-chat-quick"
          onClick={onNewChat}
          title="Start fresh conversation"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="btn-text-desktop">New Chat</span>
        </button>

        <button
          type="button"
          className={`api-key-badge-btn ${apiStatus?.hasKey ? 'active' : 'needed'}`}
          onClick={onOpenApiModal}
          title={
            apiStatus?.hasKey
              ? `API active: ${apiStatus.provider?.toUpperCase()}`
              : 'Configure your GEMINI_API_KEY or OPENAI_API_KEY'
          }
        >
          {apiStatus?.hasKey ? (
            <>
              <ShieldCheckIcon className="w-3.5 h-3.5 text-success" />
              <span className="api-badge-text">
                {apiStatus.provider === 'gemini' ? 'Gemini 2.5' : 'OpenAI'}
              </span>
            </>
          ) : (
            <>
              <KeyIcon className="w-3.5 h-3.5" />
              <span className="api-badge-text">Setup API</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}
