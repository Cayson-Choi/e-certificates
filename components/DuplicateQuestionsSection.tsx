'use client'

import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

interface DuplicateGroup {
  original: { id: number; question_code: string; created_at: string }
  duplicates: { id: number; question_code: string; created_at: string }[]
}

export default function DuplicateQuestionsSection() {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [totalDuplicates, setTotalDuplicates] = useState(0)
  const [scanned, setScanned] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleScan = async () => {
    setLoading(true)
    setResult(null)
    setScanned(false)

    try {
      const res = await fetch('/api/admin/questions/duplicates')
      const data = await res.json()

      if (!res.ok) {
        setResult({ type: 'error', message: data.error || '조회 실패' })
        return
      }

      setGroups(data.duplicateGroups || [])
      setTotalDuplicates(data.total_duplicates || 0)
      setScanned(true)

      if (data.total_duplicates === 0) {
        setResult({ type: 'success', message: '중복 문제가 없습니다' })
      }
    } catch {
      setResult({ type: 'error', message: '네트워크 오류가 발생했습니다' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAll = async () => {
    setConfirmOpen(false)
    setDeleting(true)
    setResult(null)

    // 모든 중복 그룹에서 원본 제외 나머지 ID 수집
    const ids = groups.flatMap((g) => g.duplicates.map((d) => d.id))

    try {
      const res = await fetch('/api/admin/questions/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({ type: 'error', message: data.error || '삭제 실패' })
      } else {
        setResult({ type: 'success', message: data.message })
        setGroups([])
        setTotalDuplicates(0)
      }
    } catch {
      setResult({ type: 'error', message: '네트워크 오류가 발생했습니다' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4 dark:text-white">🔍 중복 문제 관리</h2>

      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '검색 중...' : '중복 문제 검색'}
          </button>

          {scanned && totalDuplicates > 0 && (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? '삭제 중...' : `중복 ${totalDuplicates}개 일괄 삭제`}
            </button>
          )}
        </div>

        {/* 검색 결과 */}
        {scanned && groups.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {groups.length}개 그룹에서 총 {totalDuplicates}개의 중복 문제 발견 (원본은 유지, 나중에 추가된 것만 삭제)
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {groups.map((g, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium dark:text-gray-200">
                      원본: {g.original.question_code}
                    </span>
                    <span className="text-red-500 text-xs">
                      +{g.duplicates.length}개 중복
                    </span>
                  </div>
                  <div className="mt-1 text-gray-500 dark:text-gray-400 text-xs">
                    중복: {g.duplicates.map((d) => d.question_code).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 결과 메시지 */}
        {result && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            {result.message}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="중복 문제 삭제"
        message={`${totalDuplicates}개의 중복 문제를 삭제합니다.\n원본 문제는 유지되며, 나중에 추가된 중복만 삭제됩니다.\n\n계속하시겠습니까?`}
        confirmText="삭제"
        confirmColor="red"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
