export const TONES = {
  professional: {
    id: 'professional',
    label: 'Professional',
    icon: '💼',
    badge: 'Professional',
    description: 'Structured, formal, and analytical tone for executive communication and business tasks.',
    placeholder: 'Ask Vibe AI for a detailed analysis, strategic plan, or formal draft...',
  },
  casual: {
    id: 'casual',
    label: 'Casual',
    icon: '☕',
    badge: 'Casual',
    description: 'Friendly, warm, and conversational tone for relaxed chatting and creative ideation.',
    placeholder: 'Chat with Vibe AI about anything, ask for creative ideas, or brainstorm...',
  },
  concise: {
    id: 'concise',
    label: 'Concise',
    icon: '⚡',
    badge: 'Concise',
    description: 'Ultra-direct, punchy, and bulleted summaries with zero unnecessary fluff.',
    placeholder: 'Ask for a quick bullet-point answer, code fix, or quick breakdown...',
  },
}

export const SUGGESTED_PROMPTS = [
  {
    id: 'prompt-1',
    category: 'Strategy & Career',
    icon: '💼',
    tone: 'professional',
    title: 'Executive summary draft',
    prompt: 'Draft an executive summary for a new AI assistant product launch highlighting ROI, customer adoption, and enterprise security.',
  },
  {
    id: 'prompt-2',
    category: 'Engineering & Code',
    icon: '⚡',
    tone: 'concise',
    title: 'React debounce hook',
    prompt: 'Write a production-ready custom React debounce hook with TypeScript types and a clean explanation of edge cases.',
  },
  {
    id: 'prompt-3',
    category: 'Learning & Ideas',
    icon: '☕',
    tone: 'casual',
    title: 'Explain quantum computing',
    prompt: 'Explain the difference between classical bits and qubits using a simple analogy like a coin spin or light switch.',
  },
  {
    id: 'prompt-4',
    category: 'Troubleshooting',
    icon: '⚡',
    tone: 'concise',
    title: 'CSS Flexbox vs Grid checklist',
    prompt: 'Provide a concise, 5-point decision matrix on when to use CSS Grid versus Flexbox with practical real-world examples.',
  },
]
