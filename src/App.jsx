import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import WelcomeScreen from './components/WelcomeScreen'
import MessageList from './components/MessageList'
import ChatInput from './components/ChatInput'
import ApiKeyModal from './components/ApiKeyModal'
import {
  getSavedConversations,
  saveConversations,
  getSavedActiveId,
  saveActiveId,
  createNewConversationObject,
  generateTitleFromMessage,
  generateId,
} from './utils/storage'
import {
  fetchHealth,
  streamChatMessage,
  simulateDemoStream,
} from './utils/api'
import './App.css'

export default function App() {
  // --- Persistent State ---
  const [conversations, setConversations] = useState(() => {
    const saved = getSavedConversations()
    if (saved.length > 0) return saved
    const initial = createNewConversationObject('professional')
    return [initial]
  })

  const [activeId, setActiveId] = useState(() => {
    const savedId = getSavedActiveId()
    const all = getSavedConversations()
    if (savedId && all.some((c) => c.id === savedId)) return savedId
    return all[0]?.id || null
  })

  // Tone state: defaults to professional, syncs with active conversation
  const [activeTone, setActiveTone] = useState('professional')

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [apiStatus, setApiStatus] = useState(null)
  const [showApiModal, setShowApiModal] = useState(false)

  // AbortController ref for streaming cancellation
  const abortControllerRef = useRef(null)

  // Current active conversation object
  const activeConversation =
    conversations.find((c) => c.id === activeId) || conversations[0]

  // Synchronize tone when active conversation changes
  useEffect(() => {
    if (activeConversation?.tone) {
      setActiveTone(activeConversation.tone)
    }
  }, [activeId])

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  // Save activeId to localStorage
  useEffect(() => {
    if (activeId) saveActiveId(activeId)
  }, [activeId])

  // Check backend health on initial mount
  useEffect(() => {
    fetchHealth().then((health) => {
      setApiStatus(health)
    })
  }, [])

  // Keyboard shortcut: Alt+N for New Chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        handleNewChat()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [conversations])

  // --- Handlers ---

  const handleNewChat = () => {
    if (isGenerating) handleStopGeneration()
    const newConv = createNewConversationObject(activeTone)
    setConversations((prev) => [newConv, ...prev])
    setActiveId(newConv.id)
  }

  const handleSelectConversation = (id) => {
    if (id === activeId) return
    if (isGenerating) handleStopGeneration()
    setActiveId(id)
  }

  const handleDeleteConversation = (id) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id)
      if (filtered.length === 0) {
        const fresh = createNewConversationObject(activeTone)
        setActiveId(fresh.id)
        return [fresh]
      }
      if (activeId === id) {
        setActiveId(filtered[0].id)
      }
      return filtered
    })
  }

  const handleClearAll = () => {
    if (isGenerating) handleStopGeneration()
    const fresh = createNewConversationObject(activeTone)
    setConversations([fresh])
    setActiveId(fresh.id)
  }

  const handleToneChange = (newTone) => {
    setActiveTone(newTone)
    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, tone: newTone } : c))
      )
    }
  }

  // Send a user message and stream AI response
  const handleSendMessage = async (text, options = {}) => {
    if (!text || !text.trim() || isGenerating) return
    const userPrompt = text.trim()
    const currentConvId = activeConversation?.id || activeId

    const userMessage = {
      id: generateId('msg_user'),
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    }

    const assistantMessageId = generateId('msg_ai')
    const assistantPlaceholder = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      tone: activeTone,
      timestamp: Date.now(),
    }

    // Determine updated conversation title
    const isFirstMessage =
      !activeConversation?.messages || activeConversation.messages.length === 0
    const newTitle = isFirstMessage
      ? generateTitleFromMessage(userPrompt)
      : activeConversation.title

    // Append user message & placeholder
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === currentConvId) {
          return {
            ...conv,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...conv.messages, userMessage, assistantPlaceholder],
          }
        }
        return conv
      })
    )

    // Prepare message history for backend
    const conversationHistory = [
      ...(activeConversation?.messages || []),
      userMessage,
    ]

    setIsGenerating(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      if (options.demoMode) {
        // Run explicit demo preview
        await simulateDemoStream({
          prompt: userPrompt,
          tone: activeTone,
          signal: controller.signal,
          onChunk: (chunk, accumulated) => {
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id === currentConvId) {
                  return {
                    ...conv,
                    messages: conv.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulated, tone: activeTone }
                        : m
                    ),
                  }
                }
                return conv
              })
            )
          },
        })
      } else {
        // Stream from secure backend API
        await streamChatMessage({
          messages: conversationHistory,
          tone: activeTone,
          signal: controller.signal,
          onChunk: (chunk, accumulated) => {
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id === currentConvId) {
                  return {
                    ...conv,
                    messages: conv.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulated, tone: activeTone }
                        : m
                    ),
                  }
                }
                return conv
              })
            )
          },
        })
      }
    } catch (err) {
      if (controller.signal.aborted) {
        console.log('[App] Streaming aborted by user.')
      } else {
        console.error('[App] Generation error:', err)
        // Mark message as error with helpful guidance
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === currentConvId) {
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content:
                          err.message ||
                          'Could not connect to AI backend. Make sure an API key is set in .env.',
                        isError: true,
                        setupInstructions: err.setupInstructions,
                      }
                    : m
                ),
              }
            }
            return conv
          })
        )
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  // Regenerate Response
  const handleRegenerate = async (messageIndex) => {
    if (isGenerating) return
    const messages = activeConversation?.messages || []
    if (messages.length === 0) return

    // Find the user prompt to regenerate
    let targetUserPrompt = ''
    let messagesCutoff = []

    if (messages[messageIndex]?.role === 'assistant') {
      // Regenerate this assistant message based on preceding user message
      messagesCutoff = messages.slice(0, messageIndex)
      const lastUser = [...messagesCutoff].reverse().find((m) => m.role === 'user')
      if (lastUser) {
        targetUserPrompt = lastUser.content
      }
    } else {
      // Target is a user message
      messagesCutoff = messages.slice(0, messageIndex)
      targetUserPrompt = messages[messageIndex].content
    }

    if (!targetUserPrompt) return

    const currentConvId = activeConversation.id
    const assistantMessageId = generateId('msg_ai')

    const assistantPlaceholder = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      tone: activeTone,
      timestamp: Date.now(),
    }

    // Set conversation messages up to cutoff + user prompt + new placeholder
    const baseMessages = messagesCutoff.filter((m) => m.content !== targetUserPrompt)
    const userMessage = {
      id: generateId('msg_user'),
      role: 'user',
      content: targetUserPrompt,
      timestamp: Date.now(),
    }

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === currentConvId) {
          return {
            ...conv,
            updatedAt: Date.now(),
            messages: [...baseMessages, userMessage, assistantPlaceholder],
          }
        }
        return conv
      })
    )

    setIsGenerating(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await streamChatMessage({
        messages: [...baseMessages, userMessage],
        tone: activeTone,
        signal: controller.signal,
        onChunk: (chunk, accumulated) => {
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id === currentConvId) {
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: accumulated, tone: activeTone }
                      : m
                  ),
                }
              }
              return conv
            })
          );
        },
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === currentConvId) {
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: err.message || 'Failed to regenerate response.',
                        isError: true,
                        setupInstructions: err.setupInstructions,
                      }
                    : m
                ),
              }
            }
            return conv
          })
        )
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  // Stop streaming
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGenerating(false)
    }
  }

  // Export Chat as Markdown
  const handleExportChat = () => {
    if (!activeConversation || !activeConversation.messages.length) return
    let md = `# ${activeConversation.title || 'Vibe AI Conversation'}\n\n`
    md += `*Tone:* ${activeConversation.tone || 'Professional'} | *Date:* ${new Date(
      activeConversation.createdAt
    ).toLocaleString()}\n\n---\n\n`

    activeConversation.messages.forEach((m) => {
      const sender = m.role === 'user' ? '### 👤 User' : `### 🤖 Vibe AI (${m.tone || 'response'})`
      md += `${sender}\n\n${m.content}\n\n`
    })

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vibe-ai-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentMessages = activeConversation?.messages || []

  return (
    <div className="vibe-app">
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onClearAll={handleClearAll}
        apiStatus={apiStatus}
        onOpenApiModal={() => setShowApiModal(true)}
      />

      {/* Main Chat Area */}
      <div className={`chat-viewport ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <Header
          activeTone={activeTone}
          onToneChange={handleToneChange}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onNewChat={handleNewChat}
          onExportChat={handleExportChat}
          hasMessages={currentMessages.length > 0}
          apiStatus={apiStatus}
          onOpenApiModal={() => setShowApiModal(true)}
        />

        <main className="chat-main-area">
          {currentMessages.length === 0 ? (
            <WelcomeScreen
              activeTone={activeTone}
              onSelectPrompt={(prompt) => handleSendMessage(prompt)}
              onToneChange={handleToneChange}
            />
          ) : (
            <MessageList
              messages={currentMessages}
              isGenerating={isGenerating}
              onRegenerate={handleRegenerate}
            />
          )}
        </main>

        {/* Input Bar */}
        <footer className="chat-footer">
          <ChatInput
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            isGenerating={isGenerating}
            activeTone={activeTone}
            onToneChange={handleToneChange}
          />
        </footer>
      </div>

      {/* API Configuration Modal */}
      <ApiKeyModal
        isOpen={showApiModal}
        onClose={() => setShowApiModal(false)}
        apiStatus={apiStatus}
        onRunDemoMessage={() => {
          handleSendMessage('Demonstrate Vibe AI streaming and multi-tone capabilities.', {
            demoMode: true,
          })
        }}
      />
    </div>
  )
}
