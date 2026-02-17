'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import MathText from '@/components/MathText'

const QuestionSplitEditor = lazy(() => import('@/components/QuestionSplitEditor'))
const BulkUploadSplitEditor = lazy(() => import('@/components/BulkUploadSplitEditor'))

export default function AdminQuestionsPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<any[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [examFilter, setExamFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [subjects, setSubjects] = useState<any[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    loadQuestions()
  }, [examFilter])

  // 과목 목록 로드
  useEffect(() => {
    loadSubjects()
  }, [examFilter])

  // 필터링 및 검색
  useEffect(() => {
    let filtered = [...questions]

    // 과목 필터
    if (subjectFilter !== 'all') {
      filtered = filtered.filter((q) => q.subject_id === parseInt(subjectFilter))
    }

    // 검색
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (q) =>
          q.question_text?.toLowerCase().includes(query) ||
          q.choice_1?.toLowerCase().includes(query) ||
          q.choice_2?.toLowerCase().includes(query) ||
          q.choice_3?.toLowerCase().includes(query) ||
          q.choice_4?.toLowerCase().includes(query) ||
          q.question_code?.toLowerCase().includes(query)
      )
    }

    setFilteredQuestions(filtered)
    setCurrentPage(1)
  }, [questions, subjectFilter, searchQuery])

  const loadSubjects = async () => {
    try {
      if (examFilter === 'all') {
        // 전체 선택 시 모든 시험의 과목을 불러와서 합치기
        const allSubjects: any[] = []
        for (const examId of ['1', '2', '3']) {
          const res = await fetch(`/api/exams/${examId}/subjects`)
          if (res.ok) {
            const data = await res.json()
            allSubjects.push(...data)
          }
        }

        // 중복 제거 (같은 id의 과목은 하나만)
        const uniqueSubjects = Array.from(
          new Map(allSubjects.map((s) => [s.id, s])).values()
        )
        setSubjects(uniqueSubjects)
      } else {
        // 특정 시험 선택 시
        const res = await fetch(`/api/exams/${examFilter}/subjects`)
        if (res.ok) {
          const data = await res.json()
          setSubjects(data || [])
        }
      }
    } catch (err) {
      console.error('Failed to load subjects:', err)
    }
  }

  const loadQuestions = async () => {
    try {
      const url =
        examFilter === 'all'
          ? '/api/admin/questions'
          : `/api/admin/questions?exam_id=${examFilter}`

      const res = await fetch(url)
      if (res.status === 401) {
        router.push('/login?redirect=/admin/questions')
        return
      }
      if (res.status === 403) {
        router.push('/')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
      }
    } catch (err) {
      console.error('Failed to load questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('삭제되었습니다')
        loadQuestions()
      } else {
        const data = await res.json()
        alert(data.error || '삭제 실패')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('삭제 중 오류가 발생했습니다')
    }
  }

  const toggleSelectAll = () => {
    if (
      selectedQuestions.size === filteredQuestions.length &&
      filteredQuestions.length > 0
    ) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map((q) => q.id)))
    }
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedQuestions)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedQuestions(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedQuestions.size === 0) {
      alert('삭제할 문제를 선택해주세요')
      return
    }

    if (!confirm(`선택한 ${selectedQuestions.size}개 문제를 삭제하시겠습니까?`)) {
      return
    }

    try {
      const deletePromises = Array.from(selectedQuestions).map((id) =>
        fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)
      alert('삭제되었습니다')
      setSelectedQuestions(new Set())
      loadQuestions()
    } catch (err) {
      console.error('Bulk delete error:', err)
      alert('삭제 중 오류가 발생했습니다')
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
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              📝 문제 관리
            </h1>
            <p className="text-gray-600 dark:text-gray-400">문제 추가, 수정, 삭제</p>
          </div>
          <div className="flex gap-2">
            {selectedQuestions.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-6 py-3 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
              >
                선택 삭제 ({selectedQuestions.size})
              </button>
            )}
            <button
              onClick={() => setShowBulkUpload(true)}
              className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600"
            >
              📤 일괄 문제 추가
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              + 개별 문제 추가
            </button>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border dark:border-gray-700">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={examFilter}
              onChange={(e) => {
                setExamFilter(e.target.value)
                setSubjectFilter('all')
              }}
              className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">전체 시험</option>
              <option value="1">전기기능사</option>
              <option value="2">전기산업기사</option>
              <option value="3">전기기사</option>
            </select>

            {subjects.length > 0 && (
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">전체 과목</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id.toString()}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex-1 min-w-[200px] max-w-md relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문제 내용, 선택지, 문제코드 검색..."
                className="w-full px-3 py-2 pr-8 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 문제 목록 */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / itemsPerPage))
          const safePage = Math.min(currentPage, totalPages)
          const startIndex = (safePage - 1) * itemsPerPage
          const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + itemsPerPage)

          const renderPagination = () => {
            if (totalPages <= 1) return null

            const pages: (number | string)[] = []
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pages.push(i)
            } else {
              pages.push(1)
              if (safePage > 3) pages.push('...')
              for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
                pages.push(i)
              }
              if (safePage < totalPages - 2) pages.push('...')
              pages.push(totalPages)
            }

            return (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => setCurrentPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded text-sm border dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  ‹ 이전
                </button>
                {pages.map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`dot-${i}`} className="px-2 text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 rounded text-sm ${
                        p === safePage
                          ? 'bg-blue-600 dark:bg-blue-500 text-white'
                          : 'border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded text-sm border dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  다음 ›
                </button>
              </div>
            )
          }

          return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold dark:text-white">
                    문제 목록 ({filteredQuestions.length}개
                    {filteredQuestions.length !== questions.length &&
                      ` / 전체 ${questions.length}개`}
                    )
                  </h2>
                  {filteredQuestions.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          selectedQuestions.size === filteredQuestions.length &&
                          filteredQuestions.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">전체 선택</span>
                    </label>
                  )}
                </div>
                {totalPages > 1 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredQuestions.length)}번째
                  </span>
                )}
              </div>

              {/* 상단 페이지네이션 */}
              {renderPagination() && <div className="mb-4">{renderPagination()}</div>}

              {paginatedQuestions.length > 0 ? (
                <div className="space-y-4">
                  {paginatedQuestions.map((q: any) => (
                    <div
                      key={q.id}
                      className="border dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.has(q.id)}
                          onChange={() => toggleSelect(q.id)}
                          className="mt-1 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                              {q.exams?.name}
                            </span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                              {q.subjects?.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {q.question_code}
                            </span>
                            {q.image_url && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                                🖼️ 이미지 포함
                              </span>
                            )}
                          </div>
                          <MathText
                            text={q.question_text}
                            className="font-medium mb-2 dark:text-white block"
                          />
                          {q.image_url && (
                            <div className="mb-3">
                              <Image
                                src={q.image_url}
                                alt="문제 이미지"
                                width={320}
                                height={160}
                                className="max-w-xs max-h-40 object-contain rounded border border-gray-300 dark:border-gray-600"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div>
                              {q.answer === 1 ? '✓ ' : ''}1. <MathText text={q.choice_1} />
                            </div>
                            <div>
                              {q.answer === 2 ? '✓ ' : ''}2. <MathText text={q.choice_2} />
                            </div>
                            <div>
                              {q.answer === 3 ? '✓ ' : ''}3. <MathText text={q.choice_3} />
                            </div>
                            <div>
                              {q.answer === 4 ? '✓ ' : ''}4. <MathText text={q.choice_4} />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => setEditingQuestion(q)}
                            className="px-3 py-1 bg-yellow-600 dark:bg-yellow-500 text-white text-sm rounded hover:bg-yellow-700 dark:hover:bg-yellow-600"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="px-3 py-1 bg-red-600 dark:bg-red-500 text-white text-sm rounded hover:bg-red-700 dark:hover:bg-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  문제가 없습니다
                </div>
              )}

              {/* 하단 페이지네이션 */}
              {renderPagination() && <div className="mt-4">{renderPagination()}</div>}
            </div>
          )
        })()}

        {/* 하단 버튼 */}
        <Link
          href="/admin"
          className="inline-block px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
        >
          ← 관리자 페이지
        </Link>

        {/* 문제 추가/수정 분할 편집기 */}
        {(showAddForm || editingQuestion) && (
          <Suspense fallback={null}>
            <QuestionSplitEditor
              question={editingQuestion}
              onClose={() => {
                setShowAddForm(false)
                setEditingQuestion(null)
              }}
              onSuccess={() => {
                setShowAddForm(false)
                setEditingQuestion(null)
                loadQuestions()
              }}
            />
          </Suspense>
        )}

        {/* 일괄 업로드 분할 편집기 */}
        {showBulkUpload && (
          <Suspense fallback={null}>
            <BulkUploadSplitEditor
              onClose={() => setShowBulkUpload(false)}
              onSuccess={() => {
                setShowBulkUpload(false)
                loadQuestions()
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}

