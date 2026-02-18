'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function ExamStartPage({ params }: { params: Promise<{ examId: string }> }) {
  const router = useRouter()
  const [examId, setExamId] = useState<string>('')
  const [exam, setExam] = useState<any>(null)
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [activeAttempt, setActiveAttempt] = useState<any>(null)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)

  // OFFICIAL 시험용 상태
  const [password, setPassword] = useState('')
  const [studentId, setStudentId] = useState('')
  const [needStudentId, setNeedStudentId] = useState(false)
  const [savingStudentId, setSavingStudentId] = useState(false)
  const [officialQuestionCount, setOfficialQuestionCount] = useState<number | null>(null)
  const [officialBySubject, setOfficialBySubject] = useState<Record<number, number>>({})

  useEffect(() => {
    params.then(({ examId }) => {
      setExamId(examId)
      loadExamInfo(examId)
      checkActiveAttempt()
      loadProfile()
    })
  }, [])

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/account/profile')
      if (res.ok) {
        const data = await res.json()
        setStudentId(data.profile?.student_id || '')
        if (!data.profile?.student_id) {
          setNeedStudentId(true)
        }
      }
    } catch {}
  }

  const checkActiveAttempt = async () => {
    try {
      const res = await fetch('/api/attempts/active')
      if (res.ok) {
        const data = await res.json()
        setActiveAttempt(data.active)
      }
    } catch {}
  }

  const loadExamInfo = async (id: string) => {
    try {
      // 시험 정보 조회
      const examRes = await fetch(`/api/exams/${id}`)
      if (!examRes.ok) {
        setError('시험 정보를 불러올 수 없습니다')
        setLoading(false)
        return
      }
      const examData = await examRes.json()
      setExam(examData)

      // 과목 정보 조회
      const subjectsRes = await fetch(`/api/exams/${id}/subjects`)
      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json()
        setSubjects(subjectsData)
      }

      // 공식 시험: 실제 문제 수 조회 (questions_per_attempt가 아닌 실제 등록된 활성 문제 수)
      if (examData.exam_mode === 'OFFICIAL') {
        try {
          const qRes = await fetch(`/api/exams/${id}/question-count`)
          if (qRes.ok) {
            const qData = await qRes.json()
            setOfficialQuestionCount(qData.count)
            setOfficialBySubject(qData.bySubject || {})
          }
        } catch {}
      }

      setLoading(false)
    } catch (err) {
      setError('오류가 발생했습니다')
      setLoading(false)
    }
  }

  const handleSaveStudentId = async () => {
    if (!studentId.trim()) {
      setError('학번을 입력해주세요')
      return
    }
    setSavingStudentId(true)
    setError('')

    try {
      const res = await fetch('/api/profile/student-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '학번 저장 실패')
        setSavingStudentId(false)
        return
      }

      setNeedStudentId(false)
      setSavingStudentId(false)
    } catch {
      setError('오류가 발생했습니다')
      setSavingStudentId(false)
    }
  }

  const handleStart = async (abandonExisting = false) => {
    setStarting(true)
    setError('')

    // 브라우저에 paint 기회를 줘서 "시작 중..." 즉시 표시
    await new Promise(resolve => setTimeout(resolve, 0))

    try {
      const body: any = {
        exam_id: parseInt(examId),
        abandon_existing: abandonExisting,
      }

      // OFFICIAL 모드일 때 비밀번호 포함
      if (isOfficial) {
        if (!password) {
          setError('비밀번호를 입력해주세요')
          setStarting(false)
          return
        }
        body.password = password
      }

      const res = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '시험 시작에 실패했습니다')
        setStarting(false)
        return
      }

      // 시험 화면으로 이동
      router.push(`/exam/attempt/${data.attempt_id}`)
    } catch (err) {
      setError('오류가 발생했습니다')
      setStarting(false)
    }
  }

  const handleAbandonAndStart = () => {
    setShowAbandonConfirm(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">로딩 중...</div>
      </div>
    )
  }

  if (error && !exam) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md border dark:border-gray-700">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const isOfficial = exam?.exam_mode === 'OFFICIAL'
  const durationMinutes = exam?.duration_minutes || 60
  const totalQuestions = isOfficial && officialQuestionCount !== null
    ? officialQuestionCount
    : subjects.reduce((sum, s) => sum + s.questions_per_attempt, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border dark:border-gray-700">
          <h1 className="text-3xl font-bold text-center mb-2 dark:text-white">
            {exam?.name}
          </h1>
          {isOfficial ? (
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                공식 시험
              </span>
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8">모의고사</p>
          )}

          <div className="space-y-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
              <h2 className="font-bold text-lg mb-4 dark:text-white">시험 정보</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">총 문항 수:</span>
                  <span className="font-semibold dark:text-gray-200">{totalQuestions}문항</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">시험 시간:</span>
                  <span className="font-semibold dark:text-gray-200">{durationMinutes}분</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">합격 기준:</span>
                  <span className="font-semibold dark:text-gray-200">60점 이상</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border dark:border-gray-600">
              <h2 className="font-bold text-lg mb-4 dark:text-white">과목 구성</h2>
              <div className="space-y-2">
                {subjects.map((subject, index) => (
                  <div key={subject.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {index + 1}. {subject.name}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {isOfficial ? (officialBySubject[subject.id] ?? subject.questions_per_attempt) : subject.questions_per_attempt}문항
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 공식 시험 주의사항 */}
            {isOfficial && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6">
                <h2 className="font-bold text-lg mb-3 text-red-800 dark:text-red-200">공식 시험 안내</h2>
                <ul className="space-y-2 text-sm text-red-700 dark:text-red-300">
                  <li>• 전체화면 모드로 진행됩니다</li>
                  <li>• 전체화면 탈출/탭 전환 시 이탈 기록이 저장됩니다</li>
                  <li>• 모든 학생이 동일한 문제를 동일한 순서로 풀게 됩니다</li>
                  <li>• 시험 결과는 일일 랭킹에 반영되지 않습니다</li>
                </ul>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
              <h2 className="font-bold text-lg mb-3 dark:text-white">주의사항</h2>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>• 시험 시작 후 {durationMinutes}분 이내에 제출해야 합니다</li>
                <li>• 시간이 초과되면 자동으로 만료됩니다</li>
                <li>• 한 번에 하나의 시험만 응시할 수 있습니다</li>
                {!isOfficial && (
                  <li>• 23:00~23:59(KST)에는 새 시험을 시작할 수 없습니다</li>
                )}
                <li>• 답안은 자동으로 저장되며 재접속 시 이어풀기가 가능합니다</li>
              </ul>
            </div>

            {/* 공식 시험: 학번 입력 */}
            {isOfficial && needStudentId && (
              <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-6">
                <h2 className="font-bold text-lg mb-3 dark:text-white">학번 입력</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  공식 시험 응시를 위해 학번을 먼저 입력해주세요.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="학번을 입력하세요"
                    className="flex-1 px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={handleSaveStudentId}
                    disabled={savingStudentId}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingStudentId ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            )}

            {/* 공식 시험: 비밀번호 입력 */}
            {isOfficial && !needStudentId && (
              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
                <h2 className="font-bold text-lg mb-3 dark:text-white">시험 비밀번호</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  시험 감독관이 안내한 비밀번호를 입력하세요.
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* 진행 중인 시험 안내 */}
          {activeAttempt && activeAttempt.exam_id === parseInt(examId) && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-blue-800 dark:text-blue-300">진행 중인 시험이 있습니다</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                남은 시간: {Math.floor(activeAttempt.time_left_seconds / 60)}분 {activeAttempt.time_left_seconds % 60}초
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                이어풀기를 눌러 이어서 시험을 진행하세요.
              </p>
            </div>
          )}

          {activeAttempt && activeAttempt.exam_id !== parseInt(examId) && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-bold text-amber-800 dark:text-amber-300">다른 시험이 진행 중입니다</span>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">
                <strong>{activeAttempt.exam_name}</strong> 시험이 진행 중입니다 (남은 시간: {Math.floor(activeAttempt.time_left_seconds / 60)}분)
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                새 시험을 시작하려면 진행 중인 시험을 중단해야 합니다. 중단 시 답안은 모두 삭제됩니다.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Link
              href="/"
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
            >
              취소
            </Link>

            {/* 같은 시험이 진행 중 → 이어풀기 */}
            {activeAttempt && activeAttempt.exam_id === parseInt(examId) && (
              <button
                onClick={() => router.push(`/exam/attempt/${activeAttempt.attempt_id}`)}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                이어풀기
              </button>
            )}

            {/* 다른 시험이 진행 중 → 이어풀기 + 중단하고 새 시험 */}
            {activeAttempt && activeAttempt.exam_id !== parseInt(examId) && (
              <>
                <button
                  onClick={() => router.push(`/exam/attempt/${activeAttempt.attempt_id}`)}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                >
                  {activeAttempt.exam_name} 이어풀기
                </button>
                <button
                  onClick={handleAbandonAndStart}
                  disabled={starting || (isOfficial && needStudentId)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {starting ? '시작 중...' : '중단하고 새 시험'}
                </button>
              </>
            )}

            {/* 진행 중인 시험 없음 → 시험 시작 */}
            {!activeAttempt && (
              <button
                onClick={() => handleStart()}
                disabled={starting || (isOfficial && needStudentId)}
                className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starting ? '시작 중...' : '시험 시작'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 기존 시험 중단 확인 */}
      <ConfirmDialog
        open={showAbandonConfirm}
        title="진행 중인 시험 중단"
        message={`진행 중인 ${activeAttempt?.exam_name} 시험을 중단하시겠습니까?\n중단하면 해당 시험의 답안은 모두 삭제됩니다.`}
        confirmText="중단하고 새 시험 시작"
        confirmColor="red"
        onConfirm={() => {
          setShowAbandonConfirm(false)
          handleStart(true)
        }}
        onCancel={() => setShowAbandonConfirm(false)}
      />
    </div>
  )
}
