import { useState } from 'react'
import { CopyIcon, CheckIcon } from './Icons'

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="code-copy-btn"
          title="Copy code to clipboard"
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
      </div>
      <pre className="code-block-content">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function renderInlineText(text) {
  if (!text) return ''

  // Process bold: **text**
  // Process italics: *text*
  // Process inline code: `code`
  // Process links: [title](url)
  const parts = []
  let remaining = text
  let keyIndex = 0

  while (remaining.length > 0) {
    // Check for inline code `...`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      parts.push(
        <code key={keyIndex++} className="inline-code">
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Check for bold **...**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      parts.push(<strong key={keyIndex++}>{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Check for italic *...*
    const italicMatch = remaining.match(/^\*([^*]+)\*/)
    if (italicMatch) {
      parts.push(<em key={keyIndex++}>{italicMatch[1]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Check for markdown link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      parts.push(
        <a
          key={keyIndex++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="markdown-link"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Normal text chunk up to next special character
    const nextSpecial = remaining.search(/[`*\[]/)
    if (nextSpecial === -1) {
      parts.push(remaining)
      break
    } else if (nextSpecial === 0) {
      // Just a lone character that didn't match regex
      parts.push(remaining[0])
      remaining = remaining.slice(1)
    } else {
      parts.push(remaining.slice(0, nextSpecial))
      remaining = remaining.slice(nextSpecial)
    }
  }

  return parts
}

export default function MarkdownRenderer({ content = '' }) {
  if (!content) return null

  // Parse lines and fenced code blocks
  const lines = content.split('\n')
  const elements = []
  let index = 0

  let inCodeBlock = false
  let codeBlockLang = ''
  let codeBlockLines = []
  let listItems = []
  let isNumberedList = false

  const flushList = () => {
    if (listItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${index++}`} className="markdown-ol">
            {listItems.map((item, i) => (
              <li key={i}>{renderInlineText(item)}</li>
            ))}
          </ol>
        )
      } else {
        elements.push(
          <ul key={`ul-${index++}`} className="markdown-ul">
            {listItems.map((item, i) => (
              <li key={i}>{renderInlineText(item)}</li>
            ))}
          </ul>
        )
      }
      listItems = []
      isNumberedList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block delimiters: ```lang or ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        elements.push(
          <CodeBlock
            key={`code-${index++}`}
            language={codeBlockLang}
            code={codeBlockLines.join('\n')}
          />
        )
        inCodeBlock = false
        codeBlockLang = ''
        codeBlockLines = []
      } else {
        flushList()
        inCodeBlock = true
        codeBlockLang = line.trim().slice(3).trim()
        codeBlockLines = []
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={`h3-${index++}`} className="markdown-h3">
          {renderInlineText(line.slice(4))}
        </h3>
      )
      continue
    }
    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={`h2-${index++}`} className="markdown-h2">
          {renderInlineText(line.slice(3))}
        </h2>
      )
      continue
    }
    if (line.startsWith('# ')) {
      flushList()
      elements.push(
        <h1 key={`h1-${index++}`} className="markdown-h1">
          {renderInlineText(line.slice(2))}
        </h1>
      )
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList()
      elements.push(
        <blockquote key={`bq-${index++}`} className="markdown-blockquote">
          {renderInlineText(line.slice(2))}
        </blockquote>
      )
      continue
    }

    // Bullet lists: - item, * item, • item
    const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/)
    if (bulletMatch) {
      if (isNumberedList) flushList()
      isNumberedList = false
      listItems.push(bulletMatch[2])
      continue
    }

    // Numbered lists: 1. item
    const numberMatch = line.match(/^(\s*)\d+\.\s+(.*)$/)
    if (numberMatch) {
      if (!isNumberedList) flushList()
      isNumberedList = true
      listItems.push(numberMatch[2])
      continue
    }

    // Empty lines flush lists and act as paragraph separators
    if (!line.trim()) {
      flushList()
      continue
    }

    // Standard paragraph line
    flushList()
    elements.push(
      <p key={`p-${index++}`} className="markdown-p">
        {renderInlineText(line)}
      </p>
    )
  }

  // Final flushes
  if (inCodeBlock) {
    elements.push(
      <CodeBlock
        key={`code-${index++}`}
        language={codeBlockLang}
        code={codeBlockLines.join('\n')}
      />
    )
  }
  flushList()

  return <div className="markdown-container">{elements}</div>
}
