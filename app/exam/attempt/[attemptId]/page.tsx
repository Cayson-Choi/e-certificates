'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import MathText from '@/components/MathText'

export default function ExamAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const router = useRouter()
  const { attemptId } = use(params)

  const [paper, setPaper] = useState<any>(null)
  const [answers, setAnswers] = useState<Map<number, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0) // 초 단위

  useEffect(() => {
    loadPaper()
  }, [attemptId])

  // 타이머
  useEffect(() => {
    if (!paper) return

    const expiresAt = new Date(paper.expires_at).getTime()
    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000))
      setTimeLeft(diff)

      if (diff === 0) {
        alert('시험 시간이 종료되었습니다')
        router.push('/')
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [paper])

  const loadPaper = async () => {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/paper`)
      if (!res.ok) {
        setError('시험지를 불러올 수 없습니다')
        setLoading(false)
        return
      }

      const data = await res.json()
      setPaper(data)

      // 기존 답안 로드
      const newAnswers = new Map()
      data.questions.forEach((q: any) => {
        if (q.selected) {
          newAnswers.set(q.question_id, q.selected)
        }
      })
      setAnswers(newAnswers)

      setLoading(false)
    } catch (err) {
      setError('오류가 발생했습니다')
      setLoading(false)
    }
  }

  const handleAnswer = async (questionId: number, choice: number) => {
    // UI 업데이트
    const newAnswers = new Map(answers)
    newAnswers.set(questionId, choice)
    setAnswers(newAnswers)

    // 서버에 저장
    try {
      await fetch(`/api/attempts/${attemptId}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, selected: choice }),
      })
    } catch (err) {
      console.error('답안 저장 실패:', err)
    }
  }

  const handleSubmit = async () => {
    const answeredCount = answers.size
    const totalCount = paper?.questions.length || 0

    if (answeredCount < totalCount) {
      if (
        !confirm(
          `${totalCount - answeredCount}문제를 풀지 않았습니다.\n정말 제출하시겠습니까?`
        )
      ) {
        return
      }
    }

    if (!confirm('시험을 제출하시겠습니까?\n제출 후에는 수정할 수 없습니다.')) {
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '제출에 실패했습니다')
        setSubmitting(false)
        return
      }

      // 결과 페이지로 이동
      router.push(`/exam/result/${attemptId}`)
    } catch (err) {
      alert('오류가 발생했습니다')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">시험지를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const answeredCount = answers.size
  const totalCount = paper?.questions.length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 고정 바 */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{paper.exam_name}</h1>
              <div className="text-sm text-gray-600 mt-1">
                답안: {answeredCount} / {totalCount}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-bold ${
                  timeLeft < 300 ? 'text-red-600' : 'text-blue-600'
                }`}
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-600">남은 시간</div>
            </div>
          </div>
        </div>
      </div>

      {/* 문제 */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {paper.questions.map((question: any, index: number) => (
            <div
              key={question.question_id}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">{question.subject_name}</div>
                  <MathText
                    text={question.question_text}
                    className="text-lg font-medium mb-4 block"
                  />

                  {question.image_url && (
                    <div className="mb-4 relative w-full max-w-lg">
                      <Image
                        src={question.image_url}
                        alt="문제 이미지"
                        width={600}
                        height={400}
                        className="w-full h-auto rounded"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((choice) => (
                      <label
                        key={choice}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          answers.get(question.question_id) === choice
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.question_id}`}
                          checked={answers.get(question.question_id) === choice}
                          onChange={() => handleAnswer(question.question_id, choice)}
                          className="mt-1"
                        />
                        <span className="flex-1">
                          {choice}.{' '}
                          <MathText text={question[`choice_${choice}`]} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 제출 버튼 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center">
            <div className="text-gray-600">
              {answeredCount === totalCount
                ? '모든 문제를 풀었습니다'
                : `${totalCount - answeredCount}문제가 남았습니다`}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? '제출 중...' : '시험 제출'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
