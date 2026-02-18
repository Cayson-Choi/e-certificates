'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function OfficialExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // 생성 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    duration_minutes: 60,
  })

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      const res = await fetch('/api/admin/official-exams')
      if (res.status === 403) {
        router.push('/')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setExams(data)
      }
    } catch (err) {
      setError('조회 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/admin/official-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '생성 실패')
        setCreating(false)
        return
      }

      // 생성 후 바로 상세 페이지(문제 출제)로 이동
      router.push(`/admin/official-exams/${data.exam_id}`)
    } catch {
      setError('오류가 발생했습니다')
    } finally {
      setCreating(false)
    }
  }

  const handleTogglePublish = async (e: React.MouseEvent, examId: number, currentPublished: boolean) => {
    e.preventDefault()
    e.stopPropagation()

    const action = currentPublished ? '게시 종료' : '게시'
    if (!confirm(`이 시험을 ${action}하시겠습니까?`)) return

    setTogglingId(examId)
    try {
      const res = await fetch('/api/admin/official-exams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId, is_published: !currentPublished }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || `${action} 실패`)
        return
      }

      setExams((prev) =>
        prev.map((ex) => (ex.id === examId ? { ...ex, is_published: !currentPublished } : ex))
      )
    } catch {
      alert('오류가 발생했습니다')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (e: React.MouseEvent, examId: number, examName: string) => {
    e.preventDefault() // Link 클릭 방지
    e.stopPropagation()

    if (!confirm(`"${examName}" 시험을 삭제하시겠습니까?\n등록된 문제도 함께 삭제됩니다.`)) return

    setDeletingId(examId)
    try {
      const res = await fetch('/api/admin/official-exams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '삭제 실패')
        return
      }

      setExams((prev) => prev.filter((ex) => ex.id !== examId))
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              공식 시험 관리
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              중간고사/기말고사 등 공식 시험을 생성하고 관리합니다
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
            >
              관리자 홈
            </Link>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showForm ? '취소' : '새 시험 생성'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* 생성 폼 */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border dark:border-gray-700">
            <h2 className="text-xl font-bold mb-6 dark:text-white">새 공식 시험 생성</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                  시험 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 2026년 공유압실습(중간고사)"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                    비밀번호 *
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="시험 접근 비밀번호"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                    시험 시간(분) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })
                    }
                    min={1}
                    max={300}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                시험 생성 후 바로 문제 출제 화면으로 이동합니다.
              </p>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? '생성 중...' : '시험 생성'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 시험 목록 */}
        <div className="space-y-4">
          {exams.length === 0 && !showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center border dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                아직 생성된 공식 시험이 없습니다
              </p>
            </div>
          )}

          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/official-exams/${exam.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold dark:text-white">{exam.name}</h3>
                    <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-semibold">
                      공식
                    </span>
                    {exam.is_published ? (
                      <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                        게시 중
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-semibold">
                        비게시
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>시간: {exam.duration_minutes}분</span>
                    <span>문제: {exam.question_count}개</span>
                    <span>응시: {exam.attempt_count}명</span>
                    <span>비밀번호: <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{exam.password}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleTogglePublish(e, exam.id, exam.is_published)}
                    disabled={togglingId === exam.id}
                    className={`px-3 py-1.5 text-xs rounded font-medium disabled:opacity-50 ${
                      exam.is_published
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
                    }`}
                  >
                    {togglingId === exam.id ? '처리 중...' : exam.is_published ? '게시 종료' : '게시'}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, exam.id, exam.name)}
                    disabled={deletingId === exam.id}
                    className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50 font-medium disabled:opacity-50"
                  >
                    {deletingId === exam.id ? '삭제 중...' : '삭제'}
                  </button>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
