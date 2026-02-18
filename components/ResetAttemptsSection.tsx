'use client'

import { useState, useEffect, useRef } from 'react'
import ConfirmDialog from './ConfirmDialog'

interface Exam {
  id: number
  name: string
}

interface UserInfo {
  id: string
  name: string
  email: string
  phone: string | null
}

interface Props {
  exams: Exam[]
}

export default function ResetAttemptsSection({ exams }: Props) {
  const [scope, setScope] = useState<'all' | 'exam' | 'user'>('all')
  const [examId, setExamId] = useState<number | ''>('')
  const [userExamId, setUserExamId] = useState<number | ''>('')
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState<UserInfo[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 사용자 목록 로드 (사용자별 탭 선택 시)
  useEffect(() => {
    if (scope !== 'user' || users.length > 0) return
    setUsersLoading(true)
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setUsers(data.users.map((u: { id: string; name: string; email: string; phone: string | null }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false))
  }, [scope, users.length])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredUsers = userSearch.trim()
    ? users.filter((u) =>
        u.name.includes(userSearch.trim()) ||
        u.email.toLowerCase().includes(userSearch.trim().toLowerCase())
      )
    : []

  const getScopeLabel = () => {
    if (scope === 'all') return '전체 응시 기록'
    if (scope === 'exam') {
      const exam = exams.find((e) => e.id === examId)
      return exam ? `"${exam.name}" 응시 기록` : '시험별 응시 기록'
    }
    if (selectedUser) {
      const userLabel = `"${selectedUser.name}" (${selectedUser.email})`
      if (userExamId) {
        const exam = exams.find((e) => e.id === userExamId)
        return `${userLabel}의 "${exam?.name}" 응시 기록`
      }
      return `${userLabel}의 전체 응시 기록`
    }
    return '사용자별 응시 기록'
  }

  const canSubmit = () => {
    if (scope === 'exam') return examId !== ''
    if (scope === 'user') return selectedUser !== null
    return true
  }

  const handleReset = async () => {
    setConfirmOpen(false)
    setLoading(true)
    setResult(null)

    try {
      const body: Record<string, unknown> = { scope }
      if (scope === 'exam') body.exam_id = examId
      if (scope === 'user') {
        body.user_id = selectedUser?.id
        if (userExamId) body.exam_id = userExamId
      }

      const res = await fetch('/api/admin/reset-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({ type: 'error', message: data.error || '초기화 실패' })
      } else {
        setResult({ type: 'success', message: data.message })
      }
    } catch {
      setResult({ type: 'error', message: '네트워크 오류가 발생했습니다' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4 dark:text-white">🗑️ 응시 기록 초기화</h2>

      {/* 범위 선택 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            초기화 범위
          </label>
          <div className="flex gap-2">
            {([
              { value: 'all', label: '전체' },
              { value: 'exam', label: '시험별' },
              { value: 'user', label: '사용자별' },
            ] as const).map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setScope(option.value)
                  setResult(null)
                  setSelectedUser(null)
                  setUserSearch('')
                  setUserExamId('')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scope === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 시험 선택 드롭다운 */}
        {scope === 'exam' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              시험 선택
            </label>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value ? Number(e.target.value) : '')}
              className="w-full max-w-xs px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="">-- 시험을 선택하세요 --</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 사용자 검색 */}
        {scope === 'user' && (
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              사용자 검색
            </label>
            {selectedUser ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md">
                <div className="flex-1 text-sm">
                  <span className="font-medium dark:text-white">{selectedUser.name}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">{selectedUser.email}</span>
                  {selectedUser.phone && (
                    <span className="text-gray-500 dark:text-gray-400 ml-2">{selectedUser.phone}</span>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setUserSearch('') }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => { if (userSearch.trim()) setShowDropdown(true) }}
                  placeholder={usersLoading ? '사용자 목록 로딩 중...' : '이름 또는 이메일로 검색'}
                  disabled={usersLoading}
                  className="w-full max-w-md px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm disabled:opacity-50"
                />
                {showDropdown && userSearch.trim() && (
                  <div className="absolute z-50 mt-1 w-full max-w-md bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        검색 결과가 없습니다
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u)
                            setUserSearch('')
                            setShowDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm border-b last:border-b-0 dark:border-gray-600"
                        >
                          <span className="font-medium dark:text-white">{u.name}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">{u.email}</span>
                          {u.phone && (
                            <span className="text-gray-500 dark:text-gray-400 ml-2">{u.phone}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 사용자별 시험 필터 */}
        {scope === 'user' && selectedUser && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              시험 범위
            </label>
            <select
              value={userExamId}
              onChange={(e) => setUserExamId(e.target.value ? Number(e.target.value) : '')}
              className="w-full max-w-xs px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="">전체 시험</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 초기화 버튼 */}
        <div>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSubmit() || loading}
            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : '초기화 실행'}
          </button>
        </div>

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
        title="응시 기록 초기화"
        message={`${getScopeLabel()}을(를) 삭제합니다.\n랭킹 데이터도 함께 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`}
        confirmText="초기화"
        confirmColor="red"
        onConfirm={handleReset}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
