import { SUGGESTED_PROMPTS, TONES } from '../constants'
import { SparklesIcon, ShieldCheckIcon, RefreshCwIcon } from './Icons'

export default function WelcomeScreen({
  activeTone = 'professional',
  onSelectPrompt,
  onToneChange,
}) {
  const currentToneObj = TONES[activeTone] || TONES.professional

  return (
    <div className="welcome-container">
      <div className="welcome-hero">
        <div className="welcome-badge-glow">
          <SparklesIcon className="w-10 h-10 text-accent" />
        </div>
        <h2 className="welcome-title">
          Experience <span className="gradient-text">Vibe AI</span>
        </h2>
        <p className="welcome-subtitle">
          Your adaptive AI chat assistant built with real-time streaming, multi-tone calibration,
          and zero-leak credential architecture.
        </p>

        {/* Feature Highlights Pills */}
        <div className="welcome-features">
          <div className="feature-pill">
            <span className="feature-dot pulse" />
            <span>SSE Real-Time Streaming</span>
          </div>
          <div className="feature-pill">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-accent" />
            <span>Secure Backend Proxy</span>
          </div>
          <div className="feature-pill">
            <RefreshCwIcon className="w-3.5 h-3.5 text-accent" />
            <span>Regenerate & Persistent Memory</span>
          </div>
        </div>

        {/* Active Tone Banner */}
        <div className="active-tone-banner">
          <span className="banner-tone-icon">{currentToneObj.icon}</span>
          <div className="banner-tone-text">
            <strong>{currentToneObj.label} Mode Active:</strong> {currentToneObj.description}
          </div>
        </div>
      </div>

      {/* Suggested Prompts Section */}
      <div className="suggested-prompts-section">
        <div className="suggested-header">
          <span className="suggested-title">Suggested Prompts</span>
          <span className="suggested-hint">Click any card to start immediately</span>
        </div>

        <div className="suggested-grid">
          {SUGGESTED_PROMPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="prompt-card"
              onClick={() => {
                if (item.tone && item.tone !== activeTone) {
                  onToneChange(item.tone)
                }
                onSelectPrompt(item.prompt)
              }}
            >
              <div className="prompt-card-top">
                <span className="prompt-icon">{item.icon}</span>
                <span className="prompt-category">{item.category}</span>
                <span className="prompt-tone-tag">{item.tone}</span>
              </div>
              <h4 className="prompt-title">{item.title}</h4>
              <p className="prompt-body">{item.prompt}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
