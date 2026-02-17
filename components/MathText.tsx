'use client'

/**
 * MathText Component
 *
 * Safely renders text with mathematical notation including subscripts and superscripts.
 * Only allows <sub> and <sup> HTML tags for security.
 *
 * Example usage:
 * - ε<sub>1</sub> > ε<sub>2</sub> → ε₁ > ε₂
 * - x<sup>2</sup> + y<sup>2</sup> → x² + y²
 */

import { memo, useMemo } from 'react'

interface MathTextProps {
  text: string
  className?: string
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

export default memo(function MathText({ text, className = '' }: MathTextProps) {
  const sanitizedText = useMemo(() => sanitizeHtml(text), [text])

  return (
    <span
      className={`${className} [&>sub]:text-[0.7em] [&>sub]:align-sub [&>sup]:text-[0.7em] [&>sup]:align-super`}
      dangerouslySetInnerHTML={{ __html: sanitizedText }}
      style={{ color: 'inherit' }}
    />
  )
})
