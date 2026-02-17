'use client'

/**
 * MathText Component
 *
 * Safely renders text with mathematical notation.
 * Supports:
 * - LaTeX math: $...$ (inline), $$...$$ (display)
 * - HTML tags: <sub>, <sup>, <frac>
 */

import { memo, useMemo } from 'react'
import katex from 'katex'

interface MathTextProps {
  text: string
  className?: string
}

// Convert LaTeX $...$ and $$...$$ segments to KaTeX HTML
function renderLatex(text: string): string {
  // Process $$...$$ (display math) first, then $...$ (inline math)
  return text
    .replace(/\$\$(.+?)\$\$/g, (_match, tex: string) => {
      try {
        return katex.renderToString(tex, { displayMode: true, throwOnError: false })
      } catch {
        return _match
      }
    })
    .replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_match, tex: string) => {
      try {
        return katex.renderToString(tex, { displayMode: false, throwOnError: false })
      } catch {
        return _match
      }
    })
}

// Sanitize HTML: only allow <sub>, <sup>, and <frac> tags
function sanitizeHtml(html: string): string {
  // First, convert <frac> tags to proper fraction HTML
  let processed = html.replace(
    /<frac>([^<]+)\/([^<]+)<\/frac>/gi,
    '<sup>$1</sup>⁄<sub>$2</sub>'
  )

  // Allow only <sub>, </sub>, <sup>, </sup> tags
  processed = processed
    .replace(/<(?!\/?(?:sub|sup)\b)[^>]*>/gi, '') // Remove all tags except sub/sup
    .replace(/<(sub|sup)([^>]*)>/gi, '<$1>') // Remove attributes from sub/sup tags

  return processed
}

// Process text: if it contains $, use LaTeX rendering; otherwise use HTML sanitize
function processText(text: string): string {
  if (text.includes('$')) {
    return renderLatex(text)
  }
  return sanitizeHtml(text)
}

export default memo(function MathText({ text, className = '' }: MathTextProps) {
  const processedText = useMemo(() => processText(text), [text])

  return (
    <span
      className={`${className} [&>sub]:text-[0.7em] [&>sub]:align-sub [&>sup]:text-[0.7em] [&>sup]:align-super`}
      dangerouslySetInnerHTML={{ __html: processedText }}
      style={{ color: 'inherit' }}
    />
  )
})
