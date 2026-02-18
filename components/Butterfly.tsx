'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Heart {
  id: number
  x: number
  y: number
  size: number
  color: string
  angle: number
}

const heartColors = ['#ff69b4', '#ffb6c1', '#ffd700', '#ffec8b', '#ff91ca', '#fffacd', '#ffc0cb', '#ffe066']

export default function Butterfly() {
  const [mounted, setMounted] = useState(false)
  const [hearts, setHearts] = useState<Heart[]>([])
  const userNameRef = useRef<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.name
        if (name) userNameRef.current = name
      }
    })
  }, [])

  // Clean up finished hearts
  useEffect(() => {
    if (hearts.length === 0) return
    const timer = setTimeout(() => {
      setHearts((prev) => prev.slice(Math.min(8, prev.length)))
    }, 1200)
    return () => clearTimeout(timer)
  }, [hearts])

  const speakingRef = useRef(false)

  const playGreeting = useCallback(() => {
    if (speakingRef.current || typeof window === 'undefined' || !window.speechSynthesis) return
    speakingRef.current = true
    const name = userNameRef.current
    const text = name ? `안녕하세요 ${name}님!` : '로그인해주세요'
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    utterance.rate = 1
    utterance.pitch = 1.3
    utterance.volume = 0.8
    utterance.onend = () => { speakingRef.current = false }
    utterance.onerror = () => { speakingRef.current = false }
    window.speechSynthesis.speak(utterance)
  }, [])

  const handleClick = useCallback(() => {
    const newHearts: Heart[] = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 180,
      y: (Math.random() - 0.5) * 180,
      size: 14 + Math.random() * 18,
      color: heartColors[Math.floor(Math.random() * heartColors.length)],
      angle: Math.random() * 360,
    }))
    setHearts((prev) => [...prev, ...newHearts])
    playGreeting()
  }, [playGreeting])

  if (!mounted) return null

  return (
    <div className="butterfly-wrap" aria-hidden="true">
      {/* Hearts */}
      {hearts.map((h) => (
        <span
          key={h.id}
          className="heart-particle"
          style={{
            '--hx': `${h.x}px`,
            '--hy': `${h.y}px`,
            fontSize: `${h.size}px`,
            color: h.color,
            transform: `rotate(${h.angle}deg)`,
          } as React.CSSProperties}
        >
          ❤
        </span>
      ))}
      <svg
        className="butterfly-svg butterfly-clickable"
        viewBox="-60 -45 120 90"
        width="90"
        height="75"
        onClick={handleClick}
      >
        {/* Left upper wing */}
        <path
          className="wing-upper-left"
          d="M-2,-4 C-10,-25 -45,-35 -50,-15 C-55,5 -30,5 -20,8 C-12,10 -5,5 -2,-4Z"
          fill="url(#wingGrad1)"
          opacity="0.85"
        />
        {/* Left lower wing */}
        <path
          className="wing-lower-left"
          d="M-2,2 C-8,10 -35,30 -25,35 C-15,40 -8,20 -2,8Z"
          fill="url(#wingGrad2)"
          opacity="0.8"
        />
        {/* Right upper wing */}
        <path
          className="wing-upper-right"
          d="M2,-4 C10,-25 45,-35 50,-15 C55,5 30,5 20,8 C12,10 5,5 2,-4Z"
          fill="url(#wingGrad1)"
          opacity="0.85"
        />
        {/* Right lower wing */}
        <path
          className="wing-lower-right"
          d="M2,2 C8,10 35,30 25,35 C15,40 8,20 2,8Z"
          fill="url(#wingGrad2)"
          opacity="0.8"
        />
        {/* Wing patterns - spots */}
        <circle className="wing-upper-left" cx="-28" cy="-12" r="5" fill="rgba(255,255,255,0.5)" />
        <circle className="wing-upper-left" cx="-18" cy="-18" r="3" fill="rgba(255,255,255,0.3)" />
        <circle className="wing-upper-right" cx="28" cy="-12" r="5" fill="rgba(255,255,255,0.5)" />
        <circle className="wing-upper-right" cx="18" cy="-18" r="3" fill="rgba(255,255,255,0.3)" />
        {/* Body */}
        <ellipse cx="0" cy="2" rx="2.5" ry="14" fill="#1a1a1a" />
        {/* Head */}
        <circle cx="0" cy="-13" r="3.5" fill="#1a1a1a" />
        {/* Eyes */}
        <circle cx="-1.8" cy="-14" r="0.8" fill="#fff" />
        <circle cx="1.8" cy="-14" r="0.8" fill="#fff" />
        {/* Antennae */}
        <path d="M-1.5,-16 C-6,-28 -12,-32 -15,-30" stroke="#1a1a1a" strokeWidth="0.8" fill="none" />
        <circle cx="-15" cy="-30" r="1.2" fill="#ff6b35" />
        <path d="M1.5,-16 C6,-28 12,-32 15,-30" stroke="#1a1a1a" strokeWidth="0.8" fill="none" />
        <circle cx="15" cy="-30" r="1.2" fill="#ff6b35" />
        {/* Gradients */}
        <defs>
          <linearGradient id="wingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b35" />
            <stop offset="40%" stopColor="#ff3e00" />
            <stop offset="70%" stopColor="#e63900" />
            <stop offset="100%" stopColor="#ff8c00" />
          </linearGradient>
          <linearGradient id="wingGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff5500" />
            <stop offset="50%" stopColor="#ff3e00" />
            <stop offset="100%" stopColor="#cc3300" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
