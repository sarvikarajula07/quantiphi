const STORAGE_KEY = 'vibe_ai_conversations_v1'
const ACTIVE_ID_KEY = 'vibe_ai_active_id_v1'

export function generateId(prefix = 'c') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function createNewConversationObject(tone = 'professional') {
  const now = Date.now()
  return {
    id: generateId('conv'),
    title: 'New Conversation',
    tone: tone || 'professional',
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
}

export function getSavedConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('[Storage] Error reading conversations:', err)
    return []
  }
}

export function saveConversations(conversations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch (err) {
    console.error('[Storage] Error saving conversations:', err)
  }
}

export function getSavedActiveId() {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY) || null
  } catch {
    return null
  }
}

export function saveActiveId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ID_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY)
    }
  } catch (err) {
    console.error('[Storage] Error saving active conversation ID:', err)
  }
}

export function generateTitleFromMessage(messageText) {
  if (!messageText) return 'New Conversation'
  const cleaned = messageText
    .replace(/[#*`_~]/g, '')
    .trim()
    .split('\n')[0]
  if (cleaned.length <= 40) return cleaned
  return cleaned.substring(0, 37).trim() + '...'
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
