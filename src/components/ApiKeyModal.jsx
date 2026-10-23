import { useState } from 'react'
import {
  CloseIcon,
  ShieldCheckIcon,
  CopyIcon,
  CheckIcon,
  KeyIcon,
} from './Icons'

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiStatus,
  onRunDemoMessage,
}) {
  const [copiedEnv, setCopiedEnv] = useState(false)

  if (!isOpen) return null

  const envSnippet = `# .env in project root
GEMINI_API_KEY=your_gemini_api_key_here
# or
# OPENAI_API_KEY=your_openai_api_key_here`

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSnippet)
    setCopiedEnv(true)
    setTimeout(() => setCopiedEnv(false), 2000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-glow">
              <KeyIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="modal-title">API Configuration Guide</h3>
              <p className="modal-sub">Secure Backend AI Setup for Vibe AI</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          {/* Status banner */}
          <div
            className={`modal-status-badge ${apiStatus?.hasKey ? 'status-connected' : 'status-missing'}`}
          >
            <ShieldCheckIcon className="w-5 h-5" />
            <div>
              <strong>
                {apiStatus?.hasKey
                  ? `Active Provider: ${apiStatus.provider?.toUpperCase()}`
                  : 'No API Key Detected in .env'}
              </strong>
              <p className="text-xs">
                {apiStatus?.hasKey
                  ? 'Your backend proxy is successfully authenticated and ready to stream real responses.'
                  : 'Follow the 3 quick steps below to connect Google Gemini or OpenAI.'}
              </p>
            </div>
          </div>

          <div className="modal-steps">
            <h4>Quick Setup in 3 Steps:</h4>
            <ol className="setup-steps-list">
              <li>
                <strong>Create your .env file:</strong> In the root folder of this project, create a file named <code>.env</code> (or copy from <code>.env.example</code>).
              </li>
              <li>
                <strong>Add your API Key:</strong> We recommend Google Gemini because it provides a generous free tier:
                <div className="code-env-snippet">
                  <pre>
                    <code>{envSnippet}</code>
                  </pre>
                  <button
                    type="button"
                    className="copy-snippet-btn"
                    onClick={handleCopyEnv}
                  >
                    {copiedEnv ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="key-links">
                  <span>Get free Gemini key:</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-highlight"
                  >
                    Google AI Studio ↗
                  </a>
                </div>
              </li>
              <li>
                <strong>Run the dev server:</strong> Run <code>npm run dev</code> in your terminal. That&apos;s it!
              </li>
            </ol>
          </div>

          <div className="security-notice">
            <ShieldCheckIcon className="w-4 h-4 text-success" />
            <span>
              <strong>Zero-Exposure Security:</strong> Your keys are read strictly by the server-side proxy (<code>api-handler.js</code>). Secrets are never sent to the client browser or bundled in frontend code.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          {!apiStatus?.hasKey && onRunDemoMessage && (
            <button
              type="button"
              className="modal-secondary-btn"
              onClick={() => {
                onClose()
                onRunDemoMessage()
              }}
            >
              Test Demo Stream (Without Key)
            </button>
          )}

          <button
            type="button"
            className="modal-primary-btn"
            onClick={onClose}
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}
