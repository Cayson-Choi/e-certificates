'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface FullscreenEnforcerProps {
  enabled: boolean
  children: React.ReactNode
}

export default function FullscreenEnforcer({
  enabled,
  children,
}: FullscreenEnforcerProps) {
  const [showWarning, setShowWarning] = useState(false)
  const isReenteringRef = useRef(false)

  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return
    if (document.fullscreenElement) return
    isReenteringRef.current = true
    document.documentElement.requestFullscreen().catch(() => {}).finally(() => {
      setTimeout(() => {
        isReenteringRef.current = false
      }, 500)
    })
  }, [])

  useEffect(() => {
    if (!enabled) return

    if (document.fullscreenEnabled) {
      enterFullscreen()
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isReenteringRef.current) {
        setShowWarning(true)
      }
    }

    if (document.fullscreenEnabled) {
      document.addEventListener('fullscreenchange', handleFullscreenChange)
    }

    return () => {
      if (document.fullscreenEnabled) {
        document.removeEventListener('fullscreenchange', handleFullscreenChange)
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
      }
    }
  }, [enabled, enterFullscreen])

  const handleWarningClose = () => {
    setShowWarning(false)
    if (enabled) {
      enterFullscreen()
    }
  }

  if (!showWarning) return <>{children}</>

  return (
    <>
      {children}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4 border dark:border-gray-700">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">전체화면 안내</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">전체화면을 벗어났습니다. 확인을 누르면 다시 전체화면으로 전환됩니다.</p>
          <button
            onClick={handleWarningClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            확인
          </button>
        </div>
      </div>
    </>
  )
}
