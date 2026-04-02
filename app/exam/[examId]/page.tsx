'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ExamStartPage({ params }: { params: Promise<{ examId: string }> }) {
  const router = useRouter()
  const [examId, setExamId] = useState<string>('')
  const [exam, setExam] = useState<any>(null)
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  // OFFICIAL 시험용 상태
  const [password, setPassword] = useState('')
  const [officialQuestionCount, setOfficialQuestionCount] = useState<number | null>(null)
  const [officialBySubject, setOfficialBySubject] = useState<Record<number, number>>({})

  useEffect(() => {
    params.then(({ examId }) => {
      setExamId(examId)
      loadExamInfo(examId)
    })
  }, [])

  const loadExamInfo = async (id: string) => {
    try {
      // 시험 정보 + 과목 + 문제 수 병렬 조회
      const [examRes, subjectsRes, qRes] = await Promise.all([
        fetch(`/api/exams/${id}`),
        fetch(`/api/exams/${id}/subjects`),
        fetch(`/api/exams/${id}/question-count`),
      ])

      if (!examRes.ok) {
        setError('시험 정보를 불러올 수 없습니다')
        setLoading(false)
        return
      }

      const examData = await examRes.json()
      setExam(examData)

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json()
        setSubjects(subjectsData)
      }

      if (examData.exam_mode === 'OFFICIAL' && qRes.ok) {
        const qData = await qRes.json()
        setOfficialQuestionCount(qData.count)
        setOfficialBySubject(qData.bySubject || {})
      }

      setLoading(false)
    } catch (err) {
      setError('오류가 발생했습니다')
      setLoading(false)
    }
  }

  const handleStart = async () => {
    setStarting(true)
    setError('')

    // 브라우저에 paint 기회를 줘서 "시작 중..." 즉시 표시
    await new Promise(resolve => setTimeout(resolve, 0))

    try {
      const body: any = {
        exam_id: parseInt(examId),
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

            {/* 과목 구성 (공식 시험은 1과목이므로 숨김) */}
            {!isOfficial && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border dark:border-gray-600">
                <h2 className="font-bold text-lg mb-4 dark:text-white">과목 구성</h2>
                <div className="space-y-2">
                  {subjects.map((subject, index) => (
                    <div key={subject.id} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {index + 1}. {subject.name}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">{subject.questions_per_attempt}문항</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                {!isOfficial && (
                  <li>• 23:00~23:59(KST)에는 새 시험을 시작할 수 없습니다</li>
                )}
                <li>• 시험을 중단하면 기록이 삭제됩니다</li>
              </ul>
            </div>

            {/* 공식 시험: 비밀번호 입력 */}
            {isOfficial && (
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

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
            >
              취소
            </Link>
            <button
              onClick={() => handleStart()}
              disabled={starting}
              className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {starting ? '시작 중...' : '시험 시작'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
