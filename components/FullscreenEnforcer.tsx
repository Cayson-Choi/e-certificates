'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'

interface FullscreenEnforcerProps {
  attemptId: string
  enabled: boolean
  children: React.ReactNode
}

export default function FullscreenEnforcer({
  attemptId,
  enabled,
  children,
}: FullscreenEnforcerProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const isReenteringRef = useRef(false)

  const reportViolation = useCallback(async () => {
    try {
      await fetch(`/api/attempts/${attemptId}/violation`, {
        method: 'POST',
      })
    } catch (err) {
      console.error('위반 기록 실패:', err)
    }
  }, [attemptId])

  const enterFullscreen = useCallback(() => {
    if (document.fullscreenElement) return
    isReenteringRef.current = true
    document.documentElement.requestFullscreen().catch(() => {
      // 사용자 제스처 없이 호출 시 권한 에러 — 무시 (다음 클릭 시 재시도)
    }).finally(() => {
      setTimeout(() => {
        isReenteringRef.current = false
      }, 500)
    })
  }, [])

  useEffect(() => {
    if (!enabled) return

    // 마운트 시 전체화면 진입
    enterFullscreen()

    // fullscreenchange 이벤트: 전체화면 탈출 감지
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isReenteringRef.current) {
        setWarningMessage('전체화면을 벗어났습니다. 이탈 기록이 저장됩니다.')
        setShowWarning(true)
        reportViolation()
      }
    }

    // visibilitychange 이벤트: 탭 전환 감지
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningMessage('다른 탭/창으로 이동했습니다. 이탈 기록이 저장됩니다.')
        setShowWarning(true)
        reportViolation()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // 컴포넌트 언마운트 시 전체화면 해제
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [enabled, enterFullscreen, reportViolation])

  const handleWarningClose = () => {
    setShowWarning(false)
    if (enabled) {
      enterFullscreen()
    }
  }

  return (
    <>
      {children}
      <ConfirmDialog
        open={showWarning}
        title="경고: 시험 이탈 감지"
        message={warningMessage}
        confirmText="확인"
        cancelText="확인"
        confirmColor="red"
        onConfirm={handleWarningClose}
        onCancel={handleWarningClose}
      />
    </>
  )
}
