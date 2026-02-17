'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📝 문제 관리
            </h1>
            <p className="text-gray-600">문제 추가, 수정, 삭제</p>
          </div>
          <div className="flex gap-2">
            {selectedQuestions.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                선택 삭제 ({selectedQuestions.size})
              </button>
            )}
            <button
              onClick={() => setShowBulkUpload(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📤 일괄 문제 추가
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + 개별 문제 추가
            </button>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
          {/* 시험 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold min-w-[80px]">시험 필터:</span>
            <button
              onClick={() => setExamFilter('all')}
              className={`px-4 py-2 rounded ${
                examFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setExamFilter('1')}
              className={`px-4 py-2 rounded ${
                examFilter === '1'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전기기능사
            </button>
            <button
              onClick={() => setExamFilter('2')}
              className={`px-4 py-2 rounded ${
                examFilter === '2'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전기산업기사
            </button>
            <button
              onClick={() => setExamFilter('3')}
              className={`px-4 py-2 rounded ${
                examFilter === '3'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전기기사
            </button>
          </div>

          {/* 과목 필터 */}
          {subjects.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold min-w-[80px]">과목 필터:</span>
              <button
                onClick={() => setSubjectFilter('all')}
                className={`px-4 py-2 rounded ${
                  subjectFilter === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                전체
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => setSubjectFilter(subject.id.toString())}
                  className={`px-4 py-2 rounded ${
                    subjectFilter === subject.id.toString()
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          )}

          {/* 검색창 */}
          <div className="flex items-center gap-2">
            <span className="font-semibold min-w-[80px]">검색:</span>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문제 내용, 선택지, 문제 코드로 검색..."
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 문제 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">
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
                  <span className="text-sm text-gray-600">전체 선택</span>
                </label>
              )}
            </div>
          </div>

          {filteredQuestions.length > 0 ? (
            <div className="space-y-4">
              {filteredQuestions.map((q: any) => (
                <div
                  key={q.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
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
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {q.exams?.name}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {q.subjects?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {q.question_code}
                        </span>
                        {q.image_url && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            🖼️ 이미지 포함
                          </span>
                        )}
                      </div>
                      <div className="font-medium mb-2">{q.question_text}</div>
                      {q.image_url && (
                        <div className="mb-3">
                          <img
                            src={q.image_url}
                            alt="문제 이미지"
                            className="max-w-xs max-h-40 object-contain rounded border border-gray-300"
                          />
                        </div>
                      )}
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          {q.answer === 1 ? '✓ ' : ''}1. {q.choice_1}
                        </div>
                        <div>
                          {q.answer === 2 ? '✓ ' : ''}2. {q.choice_2}
                        </div>
                        <div>
                          {q.answer === 3 ? '✓ ' : ''}3. {q.choice_3}
                        </div>
                        <div>
                          {q.answer === 4 ? '✓ ' : ''}4. {q.choice_4}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              문제가 없습니다
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <Link
          href="/admin"
          className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          ← 관리자 페이지
        </Link>

        {/* 문제 추가/수정 모달 */}
        {(showAddForm || editingQuestion) && (
          <QuestionFormModal
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
        )}

        {/* 일괄 업로드 모달 */}
        {showBulkUpload && (
          <BulkUploadModal
            onClose={() => setShowBulkUpload(false)}
            onSuccess={() => {
              setShowBulkUpload(false)
              loadQuestions()
            }}
          />
        )}
      </div>
    </div>
  )
}

function QuestionFormModal({
  question,
  onClose,
  onSuccess,
}: {
  question?: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    question_code: question?.question_code || '',
    exam_id: question?.exam_id || 1,
    subject_id: question?.subject_id || 1,
    question_text: question?.question_text || '',
    choice_1: question?.choice_1 || '',
    choice_2: question?.choice_2 || '',
    choice_3: question?.choice_3 || '',
    choice_4: question?.choice_4 || '',
    answer: question?.answer || 1,
    explanation: question?.explanation || '',
    image_url: question?.image_url || '',
  })
  const [subjects, setSubjects] = useState<any[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [codeCheckStatus, setCodeCheckStatus] = useState<
    'idle' | 'checking' | 'available' | 'duplicate'
  >('idle')
  const [lastUsedCode, setLastUsedCode] = useState<string | null>(null)

  // 과목 목록 로드
  useEffect(() => {
    if (formData.exam_id) {
      loadSubjects(formData.exam_id)
    }
  }, [formData.exam_id])

  // 수정 모드일 때 초기 과목 로드
  useEffect(() => {
    if (question && question.exam_id) {
      loadSubjects(question.exam_id)
    }
  }, [question])

  // 문제 코드 실시간 중복 체크 (디바운스)
  useEffect(() => {
    if (!formData.question_code || question) return // 수정 모드에서는 체크 안함

    const timer = setTimeout(async () => {
      setCodeCheckStatus('checking')
      try {
        const res = await fetch(
          `/api/admin/questions/check-code?code=${encodeURIComponent(
            formData.question_code
          )}`
        )
        if (res.ok) {
          const data = await res.json()
          setCodeCheckStatus(data.available ? 'available' : 'duplicate')
        }
      } catch (err) {
        console.error('Code check error:', err)
        setCodeCheckStatus('idle')
      }
    }, 500) // 0.5초 대기 후 체크

    return () => clearTimeout(timer)
  }, [formData.question_code, question])

  const loadSubjects = async (examId: number) => {
    try {
      const res = await fetch(`/api/exams/${examId}/subjects`)
      if (res.ok) {
        const data = await res.json()
        setSubjects(data || [])
        // 과목 목록이 로드되면 첫 번째 과목으로 설정 (새 문제 추가 시)
        if (!question && data && data.length > 0) {
          setFormData((prev) => ({ ...prev, subject_id: data[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to load subjects:', err)
    }
  }

  const handleAutoGenerateCode = async () => {
    try {
      const res = await fetch(
        `/api/admin/questions/next-code?exam_id=${formData.exam_id}&subject_id=${formData.subject_id}`
      )

      if (res.ok) {
        const data = await res.json()
        setFormData((prev) => ({ ...prev, question_code: data.code }))
        setLastUsedCode(data.lastCode)
        setCodeCheckStatus('available')
      } else {
        const data = await res.json()
        alert(data.error || '자동 생성 실패')
      }
    } catch (err) {
      console.error('Auto generate code error:', err)
      alert('자동 생성 중 오류가 발생했습니다')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다')
      return
    }

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다')
      return
    }

    try {
      setUploadingImage(true)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setFormData((prev) => ({ ...prev, image_url: data.url }))
        alert('이미지가 업로드되었습니다')
      } else {
        const data = await res.json()
        alert(data.error || '이미지 업로드 실패')
      }
    } catch (err) {
      console.error('Image upload error:', err)
      alert('이미지 업로드 중 오류가 발생했습니다')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = question
        ? `/api/admin/questions/${question.id}`
        : '/api/admin/questions'

      const res = await fetch(url, {
        method: question ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        alert(question ? '수정되었습니다' : '추가되었습니다')
        onSuccess()
      } else {
        const data = await res.json()
        alert(data.error || '오류가 발생했습니다')
      }
    } catch (err) {
      console.error('Submit error:', err)
      alert('오류가 발생했습니다')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {question ? '문제 수정' : '문제 추가'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!question && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  문제 코드 *
                </label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={formData.question_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          question_code: e.target.value.toUpperCase(),
                        })
                      }
                      className={`w-full px-3 py-2 border rounded ${
                        codeCheckStatus === 'duplicate'
                          ? 'border-red-500 bg-red-50'
                          : codeCheckStatus === 'available'
                          ? 'border-green-500 bg-green-50'
                          : ''
                      }`}
                      placeholder="예: F-S1-001"
                      required
                    />
                    {codeCheckStatus === 'checking' && (
                      <span className="absolute right-3 top-3 text-xs text-gray-500">
                        확인 중...
                      </span>
                    )}
                    {codeCheckStatus === 'duplicate' && (
                      <span className="absolute right-3 top-3 text-xs text-red-600 font-semibold">
                        ❌ 중복
                      </span>
                    )}
                    {codeCheckStatus === 'available' && (
                      <span className="absolute right-3 top-3 text-xs text-green-600 font-semibold">
                        ✓ 사용 가능
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm whitespace-nowrap"
                  >
                    🔄 자동 생성
                  </button>
                </div>
                {lastUsedCode && (
                  <p className="text-xs text-gray-500 mb-2">
                    💡 마지막 코드: <span className="font-mono">{lastUsedCode}</span>
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  형식: [분야]-[등급]-[과목]-[번호]
                  <br />
                  예시: ELEC-F-TH-001 (전기기능사-전기이론-1번)
                  <br />
                  분야: ELEC=전기, ELCS=전기공사, ELET=전자
                  <br />
                  등급: F=기능사, I=산업기사, E=기사
                  <br />
                  비워두면 자동 생성됩니다
                </p>
              </div>
            )}

            {/* 수정 모드: 문제 코드도 수정 가능 */}
            {question && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  문제 코드 *
                </label>
                <input
                  type="text"
                  value={formData.question_code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      question_code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border rounded font-mono"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  ⚠️ 문제 코드 변경 시 주의: 이미지 파일명과 일치해야 합니다
                </p>
              </div>
            )}

            {/* 시험 선택 */}
            <div>
              <label className="block text-sm font-medium mb-1">
                시험 *
              </label>
              <select
                value={formData.exam_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    exam_id: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded"
              >
                <option value={1}>전기기능사</option>
                <option value={2}>전기산업기사</option>
                <option value={3}>전기기사</option>
              </select>
            </div>

            {/* 과목 선택 */}
            <div>
              <label className="block text-sm font-medium mb-1">
                과목 *
              </label>
              <select
                value={formData.subject_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subject_id: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded"
                required
              >
                {subjects.length === 0 ? (
                  <option value="">로딩 중...</option>
                ) : (
                  subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                문제 내용 *
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) =>
                  setFormData({ ...formData, question_text: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                선택지 1 *
              </label>
              <input
                type="text"
                value={formData.choice_1}
                onChange={(e) =>
                  setFormData({ ...formData, choice_1: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                선택지 2 *
              </label>
              <input
                type="text"
                value={formData.choice_2}
                onChange={(e) =>
                  setFormData({ ...formData, choice_2: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                선택지 3 *
              </label>
              <input
                type="text"
                value={formData.choice_3}
                onChange={(e) =>
                  setFormData({ ...formData, choice_3: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                선택지 4 *
              </label>
              <input
                type="text"
                value={formData.choice_4}
                onChange={(e) =>
                  setFormData({ ...formData, choice_4: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">정답 *</label>
              <select
                value={formData.answer}
                onChange={(e) =>
                  setFormData({ ...formData, answer: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded"
              >
                <option value={1}>1번</option>
                <option value={2}>2번</option>
                <option value={3}>3번</option>
                <option value={4}>4번</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">해설</label>
              <textarea
                value={formData.explanation}
                onChange={(e) =>
                  setFormData({ ...formData, explanation: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">이미지</label>

              {/* 이미지 URL 입력 */}
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                className="w-full px-3 py-2 border rounded mb-2"
                placeholder="이미지 URL을 직접 입력하거나 아래에서 파일 업로드"
              />

              {/* 파일 업로드 */}
              <div className="flex items-center gap-2 mb-2">
                <label
                  htmlFor="image-upload"
                  className={`px-4 py-2 bg-purple-600 text-white rounded cursor-pointer hover:bg-purple-700 text-sm ${
                    uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingImage ? '업로드 중...' : '📷 이미지 파일 업로드'}
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                {formData.image_url && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, image_url: '' })
                    }
                    className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    이미지 제거
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-2">
                이미지 파일을 업로드하거나 URL을 직접 입력하세요 (선택사항, 최대 5MB)
              </p>

              {/* 이미지 미리보기 */}
              {formData.image_url && (
                <div className="mt-2 p-2 border rounded bg-gray-50">
                  <p className="text-xs font-medium mb-2">이미지 미리보기:</p>
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="max-w-full max-h-48 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling!.classList.remove('hidden')
                    }}
                  />
                  <p className="text-xs text-red-500 hidden">
                    이미지를 불러올 수 없습니다
                  </p>
                </div>
              )}
            </div>

            {/* 시험지 미리보기 */}
            {formData.question_text && formData.choice_1 && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3 text-gray-700">
                  📄 시험지 미리보기 (학생에게 보이는 화면)
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                        1
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 mb-2">
                          {subjects.find((s) => s.id === formData.subject_id)
                            ?.name || '과목'}
                        </div>
                        <div className="text-lg font-medium mb-4">
                          {formData.question_text}
                        </div>

                        {formData.image_url && (
                          <img
                            src={formData.image_url}
                            alt="문제 이미지"
                            className="mb-4 max-w-full h-auto rounded"
                          />
                        )}

                        <div className="space-y-3">
                          {[1, 2, 3, 4].map((choice) => {
                            const choiceText =
                              formData[`choice_${choice}` as keyof typeof formData]
                            if (!choiceText) return null
                            return (
                              <div
                                key={choice}
                                className={`flex items-start gap-3 p-4 border-2 rounded-lg ${
                                  formData.answer === choice
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <input
                                  type="radio"
                                  checked={formData.answer === choice}
                                  readOnly
                                  className="mt-1"
                                />
                                <span className="flex-1">
                                  {choice}. {choiceText}
                                  {formData.answer === choice && (
                                    <span className="ml-2 text-xs text-green-600 font-semibold">
                                      (정답)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {formData.explanation && (
                          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                            <p className="text-xs font-semibold text-blue-800 mb-1">
                              💡 해설
                            </p>
                            <p className="text-sm text-gray-700">
                              {formData.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {question ? '수정' : '추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function BulkUploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [uploadType, setUploadType] = useState<'json' | 'csv'>('json')
  const [textInput, setTextInput] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!textInput.trim()) {
      alert('입력 내용이 없습니다')
      return
    }

    try {
      setUploading(true)

      let questions: any[] = []

      if (uploadType === 'json') {
        // JSON 파싱
        try {
          const parsed = JSON.parse(textInput)
          questions = Array.isArray(parsed) ? parsed : [parsed]
        } catch (err) {
          alert('잘못된 JSON 형식입니다')
          return
        }
      } else {
        // CSV 파싱
        const lines = textInput.trim().split('\n')
        const headers = lines[0].split(',').map((h) => h.trim())

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim())
          const question: any = {}

          headers.forEach((header, index) => {
            const value = values[index]
            // answer만 숫자로 변환
            if (header === 'answer' && value) {
              question[header] = parseInt(value)
            } else {
              question[header] = value || ''
            }
          })

          questions.push(question)
        }
      }

      // 일괄 업로드 API 호출
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })

      if (res.ok) {
        const result = await res.json()

        // 에러 상세 메시지 표시
        let message = `업로드 완료!\n성공: ${result.success}개\n실패: ${result.failed}개`

        if (result.errors && result.errors.length > 0) {
          message += '\n\n실패 상세:'
          result.errors.slice(0, 5).forEach((err: any) => {
            message += `\n- ${err.index}번째: ${err.error}`
          })
          if (result.errors.length > 5) {
            message += `\n... 외 ${result.errors.length - 5}개`
          }
        }

        alert(message)

        if (result.success > 0) {
          onSuccess()
        }
      } else {
        const error = await res.json()
        alert(`업로드 실패: ${error.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('Bulk upload error:', err)
      alert('업로드 중 오류가 발생했습니다')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">📤 문제 일괄 업로드</h2>

          {/* 업로드 타입 선택 */}
          <div className="mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setUploadType('json')}
                className={`px-4 py-2 rounded ${
                  uploadType === 'json'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setUploadType('csv')}
                className={`px-4 py-2 rounded ${
                  uploadType === 'csv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                CSV
              </button>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="mb-4 p-4 bg-blue-50 rounded text-sm">
            <p className="font-semibold mb-2">
              {uploadType === 'json' ? 'JSON 형식' : 'CSV 형식'}
            </p>
            {uploadType === 'json' ? (
              <pre className="text-xs overflow-x-auto">
                {`[
  {
    "exam": "전기기능사",
    "subject": "전기이론",
    "question_text": "옴의 법칙에서 전압은?",
    "choice_1": "V = I × R",
    "choice_2": "V = I / R",
    "choice_3": "V = R / I",
    "choice_4": "V = I + R",
    "answer": 1,
    "explanation": "옴의 법칙: V = I × R",
    "image_url": ""
  }
]`}
              </pre>
            ) : (
              <pre className="text-xs overflow-x-auto">
                {`exam,subject,question_text,choice_1,choice_2,choice_3,choice_4,answer,explanation,image_url
전기기능사,전기이론,옴의 법칙에서 전압은?,V=I×R,V=I/R,V=R/I,V=I+R,1,옴의 법칙: V=I×R,`}
              </pre>
            )}
            <p className="mt-2 text-gray-600">
              * exam: "전기기능사" / "전기산업기사" / "전기기사" (정확히 입력)
              <br />* subject: 과목명 (전기이론, 전기기기 등)
              <br />* answer: 1~4 중 정답 번호
              <br />* question_code는 자동 생성됩니다
            </p>
          </div>

          {/* 입력 영역 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              {uploadType === 'json' ? 'JSON' : 'CSV'} 데이터 입력
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              rows={12}
              placeholder={
                uploadType === 'json'
                  ? 'JSON 배열을 입력하세요...'
                  : 'CSV 데이터를 입력하세요 (첫 줄은 헤더)...'
              }
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
            >
              취소
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400"
            >
              {uploading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
